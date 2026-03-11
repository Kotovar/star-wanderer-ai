import { getArtifactEffectValue, findActiveArtifact } from "@/game/artifacts";
import { ARTIFACT_TYPES } from "@/game/constants";
import { RACES } from "@/game/constants/races";
import * as enemyAttack from "./enemyAttack";
import type { GameState, GameStore, Module, ModuleType } from "@/game/types";

/**
 * Priority values for enemy AI targeting
 * Higher = more important target
 */
const MODULE_TARGET_PRIORITY: Record<ModuleType, number> = {
    weaponbay: 100,
    cockpit: 90,
    reactor: 85,
    engine: 70,
    shield: 60,
    lifesupport: 50,
    fueltank: 45,
    medical: 40,
    cargo: 20,
    scanner: 15,
    drill: 5,
    lab: 5,
    ai_core: 5,
    weaponShed: 0,
};

const DEFAULT_MODULE_PRIORITY = 30;

// Health-based priority bonuses
const HEALTH_CRITICAL_THRESHOLD = 30;
const HEALTH_CRITICAL_BONUS = 30;
const HEALTH_DAMAGED_THRESHOLD = 50;
const HEALTH_DAMAGED_BONUS = 15;
const HEALTH_SCRATCHED_THRESHOLD = 70;
const HEALTH_SCRATCHED_BONUS = 5;

// Crew presence bonus
const CREW_PRESENCE_BONUS = 10;

// Random variance
const PRIORITY_VARIANCE = 20;

/**
 * Обрабатывает атаку врага по кораблю игрока
 */
export function executeEnemyAttack(
    state: GameState,
    set: (fn: (s: GameState) => void) => void,
    get: () => GameStore,
) {
    const combat = state.currentCombat;
    if (!combat) return;

    // Calculate enemy damage from alive modules
    const eDmg = enemyAttack.calculateEnemyDamage(combat.enemy.modules);
    if (eDmg <= 0) {
        get().addLog(
            "⚠️ Враг не может атаковать - все орудия уничтожены!",
            "info",
        );
        return;
    }

    // Select target module by priority
    const activeMods = state.ship.modules.filter((m) => m.health > 0);
    const targetModule = selectTargetModule(activeMods, get);
    if (!targetModule) return;

    // Check for Mirror Shield reflection
    if (processMirrorShield(state, set, get, eDmg, combat)) return;

    // Apply damage to ship
    applyDamageToShip(state, set, get, eDmg, targetModule);

    // Check for dead crew
    const deadCrew = get().crew.filter((c) => c.health <= 0);
    if (deadCrew.length > 0) {
        set((s) => ({ crew: s.crew.filter((c) => c.health > 0) }));
        get().addLog(
            `☠️ Потери экипажа: ${deadCrew.map((c) => c.name).join(", ")}`,
            "error",
        );
    }

    // Boss regeneration and special abilities
    processBossAbilities(state, set, get);

    // Check defeat
    get().checkGameOver();

    // Clear selection
    set((s) => {
        if (!s.currentCombat) return;
        s.currentCombat.enemy.selectedModule = null;
    });
}

/**
 * Selects target module by priority
 */
function selectTargetModule(
    activeMods: Module[],
    get: () => GameStore,
): Module | null {
    if (activeMods.length === 0) return null;

    const getModuleTargetPriority = (m: Module): number => {
        let priority = 0;
        const crewInModule = get().crew.filter((c) => c.moduleId === m.id);

        priority = MODULE_TARGET_PRIORITY[m.type] ?? DEFAULT_MODULE_PRIORITY;

        // Bonus for damaged modules (easier to destroy)
        if (m.health < HEALTH_CRITICAL_THRESHOLD) {
            priority += HEALTH_CRITICAL_BONUS;
        } else if (m.health < HEALTH_DAMAGED_THRESHOLD) {
            priority += HEALTH_DAMAGED_BONUS;
        } else if (m.health < HEALTH_SCRATCHED_THRESHOLD) {
            priority += HEALTH_SCRATCHED_BONUS;
        }

        // Bonus for modules with crew (kill crew)
        priority += crewInModule.length * CREW_PRESENCE_BONUS;

        // Add some randomness
        priority += Math.random() * PRIORITY_VARIANCE;

        return priority;
    };

    const sortedMods = [...activeMods].sort(
        (a, b) => getModuleTargetPriority(b) - getModuleTargetPriority(a),
    );
    return sortedMods[0];
}

/**
 * Processes Mirror Shield reflection
 */
function processMirrorShield(
    state: GameState,
    set: (fn: (s: GameState) => void) => void,
    get: () => GameStore,
    enemyDamage: number,
    combat: GameState["currentCombat"],
): boolean {
    const mirrorShield = findActiveArtifact(
        state.artifacts,
        ARTIFACT_TYPES.MIRROR_SHIELD,
    );
    if (!mirrorShield || !combat) return false;
    if (Math.random() >= getArtifactEffectValue(mirrorShield, state))
        return false;

    const aliveModules = combat.enemy.modules.filter((m) => m.health > 0);
    if (aliveModules.length === 0) return false;

    const reflectedTarget =
        aliveModules[Math.floor(Math.random() * aliveModules.length)];
    let remainingDamage = enemyDamage;

    // Apply to enemy shields
    if (combat.enemy.shields > 0) {
        const shieldAbsorb = Math.min(combat.enemy.shields, remainingDamage);
        set((s) => {
            if (!s.currentCombat) return;
            s.currentCombat.enemy.shields -= shieldAbsorb;
        });
        remainingDamage -= shieldAbsorb;
        get().addLog(`🛡️ Щиты врага поглотили: -${shieldAbsorb}`, "info");
    }

    // Apply to module
    if (remainingDamage > 0) {
        set((s) => {
            if (!s.currentCombat) return;
            const mod = s.currentCombat.enemy.modules.find(
                (m) => m.id === reflectedTarget.id,
            );
            if (mod) mod.health = Math.max(0, mod.health - remainingDamage);
        });
        get().addLog(
            `🛡️ ЗЕРКАЛЬНЫЙ ЩИТ! Атака отражена в "${reflectedTarget.name}"! -${remainingDamage}%`,
            "info",
        );
    } else {
        get().addLog(
            `🛡️ ЗЕРКАЛЬНЫЙ ЩИТ! Атака полностью поглощена щитами врага!`,
            "info",
        );
    }

    return true;
}

/**
 * Applies damage to player ship
 */
function applyDamageToShip(
    state: GameState,
    set: (fn: (s: GameState) => void) => void,
    get: () => GameStore,
    enemyDamage: number,
    targetModule: Module,
) {
    if (state.ship.shields > 0) {
        const sDmg = Math.min(state.ship.shields, enemyDamage);
        set((s) => {
            s.ship.shields -= sDmg;
        });
        get().addLog(`Враг по щитам: -${sDmg}`, "warning");

        const overflow = enemyDamage - sDmg;
        if (overflow > 0) {
            applyModuleDamage(state, set, get, overflow, targetModule);
        }
    } else {
        applyModuleDamage(state, set, get, enemyDamage, targetModule);
    }
}

/**
 * Applies damage to module and crew
 */
function applyModuleDamage(
    state: GameState,
    set: (fn: (s: GameState) => void) => void,
    get: () => GameStore,
    damage: number,
    targetModule: Module,
) {
    const moduleDefense = targetModule.defense ?? 0;
    let damageAfterArmor = Math.max(1, damage - moduleDefense);

    if (moduleDefense > 0 && damageAfterArmor < damage) {
        get().addLog(
            `🛡️ Броня модуля "${targetModule.name}": -${damage - damageAfterArmor} урона`,
            "info",
        );
    }

    // Crystal Armor artifact
    const crystalArmor = findActiveArtifact(
        state.artifacts,
        ARTIFACT_TYPES.CRYSTALLINE_ARMOR,
    );
    if (crystalArmor) {
        const artifactDefense = getArtifactEffectValue(crystalArmor, state);
        damageAfterArmor = Math.max(1, damageAfterArmor - artifactDefense);
        get().addLog(
            `💎 Кристаллическая Броня: -${artifactDefense} урона (артефакт)`,
            "info",
        );
    }

    // Crystalline race percentage reduction
    let crystallineDefense = 0;
    state.crew
        .filter((c) => c.race === "crystalline")
        .forEach((c) => {
            const race = RACES[c.race];
            const armorTrait = race?.specialTraits?.find(
                (t) => t.id === "crystal_armor",
            );
            if (armorTrait?.effects.moduleDefense) {
                crystallineDefense += armorTrait.effects.moduleDefense;
            }
        });

    const reducedDamage = Math.floor(
        damageAfterArmor * (1 - crystallineDefense),
    );
    const wasDestroyed = targetModule.health <= reducedDamage;

    set((s) => {
        const mod = s.ship.modules.find((m) => m.id === targetModule.id);
        if (mod) mod.health = Math.max(0, mod.health - reducedDamage);
    });

    get().addLog(
        `Враг по "${targetModule.name}": -${reducedDamage}%`,
        "warning",
    );

    // Damage crew in module
    let crewDmg = Math.floor(reducedDamage * 0.5);
    if (targetModule.health < 30) {
        crewDmg = Math.floor(crewDmg * 1.5);
        get().addLog(
            `⚠️ Модуль повреждён! Экипаж получает повышенный урон!`,
            "error",
        );
    }

    damageCrewInModule(targetModule.id, crewDmg, wasDestroyed, set, get, state);
}

/**
 * Damages crew in module
 */
function damageCrewInModule(
    moduleId: number,
    damage: number,
    isDestruction: boolean,
    set: (fn: (s: GameState) => void) => void,
    get: () => GameStore,
    state: GameState,
) {
    const crewInModule = get().crew.filter((c) => c.moduleId === moduleId);
    if (crewInModule.length === 0) return;

    const actualDamage = isDestruction ? Math.floor(damage * 1.5) : damage;

    // Check for immortality artifacts
    const lifeCrystal = findActiveArtifact(
        state.artifacts,
        ARTIFACT_TYPES.LIFE_CRYSTAL,
    );
    const undyingArtifact = findActiveArtifact(
        state.artifacts,
        ARTIFACT_TYPES.UNDYING_CREW,
    );
    const hasImmortality = !!(lifeCrystal || undyingArtifact);

    // Check for AI Neural Link
    const hasAIArtifact = findActiveArtifact(
        state.artifacts,
        ARTIFACT_TYPES.AI_NEURAL_LINK,
    );

    // First aid reduction
    const hasFirstAid = crewInModule.some(
        (c) => c.combatAssignment === "firstaid",
    );
    const firstAidReduction = hasFirstAid ? 0.5 : 0;

    set((s) => {
        s.crew.forEach((c) => {
            if (c.moduleId !== moduleId) return;
            let newHealth = c.health - actualDamage;
            if (hasFirstAid) {
                newHealth =
                    c.health -
                    Math.floor(actualDamage * (1 - firstAidReduction));
            }
            if (hasImmortality && newHealth < 1) newHealth = 1;
            c.health = Math.max(0, newHealth);
        });
    });

    if (isDestruction) {
        get().addLog(
            `💥 Модуль уничтожен! Экипаж получает критический урон: -${actualDamage}`,
            "error",
        );
    } else {
        get().addLog(
            `👤 Экипаж в модуле получил урон: -${actualDamage}`,
            "warning",
        );
    }

    // Check if all crew died
    const remainingCrew = get().crew.filter((c) => c.health > 0);
    if (remainingCrew.length === 0 && !hasAIArtifact && !hasImmortality) {
        get().addLog("💀 ВЕСЬ ЭКИПАЖ ПОГИБ! Игра окончена.", "error");
        set(() => ({
            gameOver: true,
            gameOverReason: "Весь экипаж погиб в бою",
        }));
    }
}

/**
 * Processes boss regeneration and special abilities
 */
function processBossAbilities(
    state: GameState,
    set: (fn: (s: GameState) => void) => void,
    get: () => GameStore,
) {
    const combat = state.currentCombat;
    if (!combat?.enemy.isBoss) return;

    const boss = combat.enemy;

    // Regeneration
    if (boss.regenRate && boss.regenRate > 0) {
        const aliveModules = boss.modules.filter((m) => m.health > 0);
        if (aliveModules.length > 0) {
            const regenAmount = boss.regenRate;
            set((s) => {
                if (!s.currentCombat) return;
                s.currentCombat.enemy.modules.forEach((m) => {
                    if (m.health > 0 && m.health < (m.maxHealth ?? 100)) {
                        m.health = Math.min(
                            m.maxHealth ?? 100,
                            m.health + regenAmount,
                        );
                    }
                });
            });
            get().addLog(`⚙️ Регенерация босса: +${regenAmount}%`, "warning");
        }
    }

    // Special ability: every_turn
    if (
        boss.specialAbility?.trigger === "every_turn" &&
        boss.specialAbility.effect === "heal_all"
    ) {
        const healAmount = boss.specialAbility.value ?? 10;
        set((s) => {
            if (!s.currentCombat) return;
            s.currentCombat.enemy.modules.forEach((m) => {
                if (m.health > 0) {
                    m.health = Math.min(
                        m.maxHealth ?? 100,
                        m.health + healAmount,
                    );
                }
            });
        });
        get().addLog(
            `★ ${boss.specialAbility.name}: +${healAmount}% ко всем модулям`,
            "warning",
        );
    }
}
