import { getArtifactEffectValue, findActiveArtifact } from "@/game/artifacts";
import {
    ARTIFACT_TYPES,
    COMBAT_ACCURACY_MODIFIERS,
    RESEARCH_TREE,
    RACES,
    PILOT_EVASION_COMBAT_EXP,
} from "@/game/constants";
import { AUGMENTATIONS } from "@/game/constants/augmentations";
import { playSound } from "@/sounds";
import { getTotalEvasion } from "@/game/slices/ship/helpers/getTotalEvasion";
import type { GameState, GameStore, Module, ModuleType } from "@/game/types";
import * as enemyAttack from "./enemyAttack";
import {
    getBossAttackModifiers,
    processBossRegeneration,
} from "./bossAbilities";

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
    quarters: 5,
    repair_bay: 10,
    weaponShed: 0,
    bio_research_lab: 5,
    pulse_drive: 50,
    habitat_module: 30,
    deep_survey_array: 10,
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

    // Boss attack modifiers (from alive passive modules)
    const aliveBossMods = combat.enemy.isBoss
        ? combat.enemy.modules.filter((m) => m.health > 0)
        : [];
    const bossModifiers = combat.enemy.isBoss
        ? getBossAttackModifiers(
              aliveBossMods,
              combat.enemy.bossAttackCount ?? 0,
          )
        : null;

    // Apply guaranteed crit and multi_hit multipliers
    let finalDamage = eDmg;
    if (bossModifiers) {
        if (bossModifiers.isGuaranteedCrit) {
            finalDamage = Math.floor(finalDamage * 1.5);
            get().addLog(`💥 Гарантированный крит босса!`, "error");
        }
        finalDamage = Math.floor(finalDamage * bossModifiers.multiHitCount);
    }

    // Select target module by priority
    const activeMods = state.ship.modules.filter((m) => m.health > 0);
    const targetModule = selectTargetModule(activeMods, get);
    if (!targetModule) return;

    // Evasion check
    const evasionChance = getTotalEvasion(state) / 100;
    if (evasionChance > 0 && Math.random() < evasionChance) {
        const pilot = state.crew.find((c) => c.profession === "pilot");
        get().addLog(
            `✈️ ${pilot ? `Пилот ${pilot.name} уклонился` : "Корабль уклонился"} от атаки! (${Math.round(evasionChance * 100)}% шанс)`,
            "info",
        );
        if (pilot) get().gainExp(pilot, PILOT_EVASION_COMBAT_EXP);
        return;
    }

    // phase_step: handled per-crew-member below in the damage loop

    // Sabotage check — scout's sabotage gives enemy a miss chance (scales with level)
    const scoutWithSabotage = state.crew.find(
        (c) => c.combatAssignment === "sabotage",
    );
    if (scoutWithSabotage) {
        const sabotageChance =
            Math.abs(COMBAT_ACCURACY_MODIFIERS.SABOTAGE_PENALTY) +
            (scoutWithSabotage.level ?? 1) * 0.01;
        if (Math.random() < sabotageChance) {
            get().addLog(`🔧 Диверсия! Враг промахнулся!`, "info");
            return;
        }
    }

    // Check for Mirror Shield reflection
    if (processMirrorShield(state, set, get, eDmg, combat)) return;

    // Phase Shield: 20% chance to nullify attack if shields >= 20% of max
    if (
        state.research.researchedTechs.includes("phase_shield") &&
        state.ship.shields > 0 &&
        state.ship.maxShields > 0 &&
        state.ship.shields >= state.ship.maxShields * 0.2 &&
        Math.random() < 0.2
    ) {
        get().addLog(
            `🔷 Фазовый щит! Атака полностью поглощена! (20% шанс)`,
            "info",
        );
        return;
    }

    // Apply damage to ship
    applyDamageToShip(
        state,
        set,
        get,
        finalDamage,
        targetModule,
        bossModifiers?.shieldPiercePercent ?? 0,
        bossModifiers?.ignoreDefense ?? false,
    );

    // Increment boss attack count
    if (combat.enemy.isBoss) {
        set((s) => {
            if (!s.currentCombat) return;
            s.currentCombat.enemy.bossAttackCount =
                (s.currentCombat.enemy.bossAttackCount ?? 0) + 1;
        });
    }

    // Shield break: strip extra shields after attack
    if (
        bossModifiers &&
        bossModifiers.shieldBreakAmount > 0 &&
        get().ship.shields > 0
    ) {
        set((s) => {
            s.ship.shields = Math.max(
                0,
                s.ship.shields - bossModifiers.shieldBreakAmount,
            );
        });
        get().addLog(
            `⚡ Разрушение щитов: -${bossModifiers.shieldBreakAmount}`,
            "warning",
        );
    }

    // Heal on damage
    if (bossModifiers && bossModifiers.healOnDamagePercent > 0) {
        const healAmount = Math.floor(
            (finalDamage * bossModifiers.healOnDamagePercent) / 100,
        );
        if (healAmount > 0) {
            set((s) => {
                if (!s.currentCombat) return;
                s.currentCombat.enemy.modules.forEach((m) => {
                    if (m.health > 0)
                        m.health = Math.min(
                            m.maxHealth ?? 100,
                            m.health + healAmount,
                        );
                });
            });
            get().addLog(`🩸 Вампиризм модуля: +${healAmount} HP`, "warning");
        }
    }

    // Turn skip
    if (
        bossModifiers &&
        bossModifiers.turnSkipChance > 0 &&
        Math.random() * 100 < bossModifiers.turnSkipChance
    ) {
        set((s) => {
            if (!s.currentCombat) return;
            s.currentCombat.skipPlayerTurn = true;
        });
        get().addLog(
            `⏭️ Пропуск хода! Следующая атака будет пропущена!`,
            "error",
        );
    }

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
    processBossRegeneration(state, set, get);

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
 * @param shieldPiercePercent - % of damage that bypasses shields entirely
 * @param ignoreDefense - if true, module armor is bypassed
 */
function applyDamageToShip(
    state: GameState,
    set: (fn: (s: GameState) => void) => void,
    get: () => GameStore,
    enemyDamage: number,
    targetModule: Module,
    shieldPiercePercent = 0,
    ignoreDefense = false,
) {
    // Split damage: piercing portion bypasses shields
    const piercingDamage =
        shieldPiercePercent > 0
            ? Math.floor((enemyDamage * shieldPiercePercent) / 100)
            : 0;
    const normalDamage = enemyDamage - piercingDamage;

    // Apply piercing damage directly to module
    if (piercingDamage > 0) {
        get().addLog(
            `🔱 Пробитие щитов: ${piercingDamage} урона игнорирует щиты`,
            "warning",
        );
        applyModuleDamage(
            state,
            set,
            get,
            piercingDamage,
            targetModule,
            ignoreDefense,
        );
    }

    // Apply normal damage through shields
    let shieldDmgDealt = 0;
    let hullDmgDealt = 0;

    if (normalDamage > 0) {
        if (state.ship.shields > 0) {
            const sDmg = Math.min(state.ship.shields, normalDamage);
            shieldDmgDealt = sDmg;
            set((s) => {
                s.ship.shields -= sDmg;
            });
            get().addLog(`Враг по щитам: -${sDmg}`, "warning");

            const overflow = normalDamage - sDmg;
            if (overflow > 0) {
                hullDmgDealt = overflow;
                applyModuleDamage(
                    state,
                    set,
                    get,
                    overflow,
                    targetModule,
                    ignoreDefense,
                );
            }
        } else {
            hullDmgDealt = normalDamage;
            applyModuleDamage(
                state,
                set,
                get,
                normalDamage,
                targetModule,
                ignoreDefense,
            );
        }
    }

    // Record hit for UI animations
    set((s) => {
        if (!s.currentCombat) return;
        s.currentCombat.lastPlayerHit = {
            moduleId: targetModule.id,
            moduleName: targetModule.name,
            shieldDamage: shieldDmgDealt,
            hullDamage: hullDmgDealt,
        };
    });
}

/**
 * Applies damage to module and crew
 * @param forceIgnoreDefense - bypass all module armor (boss ignore_defense passive)
 */
function applyModuleDamage(
    state: GameState,
    set: (fn: (s: GameState) => void) => void,
    get: () => GameStore,
    damage: number,
    targetModule: Module,
    forceIgnoreDefense = false,
) {
    // Overclock removes armor of the weaponbay the engineer is in
    const hasOverclockInModule = state.crew.some(
        (c) =>
            c.moduleId === targetModule.id &&
            c.combatAssignment === "overclock",
    );
    const moduleDefense =
        forceIgnoreDefense || hasOverclockInModule
            ? 0
            : (targetModule.defense ?? 0);
    if (forceIgnoreDefense && (targetModule.defense ?? 0) > 0) {
        get().addLog(
            `💀 Игнорирование брони: "${targetModule.name}" - броня пробита!`,
            "error",
        );
    } else if (hasOverclockInModule && (targetModule.defense ?? 0) > 0) {
        get().addLog(
            `⚠️ Перегрузка: броня "${targetModule.name}" отключена!`,
            "warning",
        );
    }
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

    // Crystalline race flat defense bonus (+0.5 per crew member)
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

    const reducedDamage = Math.max(
        0,
        damageAfterArmor - Math.floor(crystallineDefense),
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
    playSound("damage");

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

    // Tech-based crew damage reduction (e.g. stellar_genetics)
    const techCrewReduction = state.research.researchedTechs.reduce(
        (sum, techId) => {
            const tech = RESEARCH_TREE[techId];
            return (
                sum +
                tech.bonuses
                    .filter((b) => b.type === "crew_damage_reduction")
                    .reduce((s, b) => s + b.value, 0)
            );
        },
        0,
    );

    // phase_step: pre-roll dodge for each crew member in the module
    const phaseStepDodgers = new Set<number>();
    state.crew.forEach((c) => {
        if (c.moduleId !== moduleId || !c.augmentation) return;
        const dodgeChance =
            AUGMENTATIONS[c.augmentation]?.effect?.fullDodgeChance ?? 0;
        if (dodgeChance > 0 && Math.random() < dodgeChance) {
            phaseStepDodgers.add(c.id);
        }
    });

    set((s) => {
        s.crew.forEach((c) => {
            if (c.moduleId !== moduleId) return;
            if (phaseStepDodgers.has(c.id)) return;
            const veteranReduction =
                c.traits?.reduce((max, trait) => {
                    return Math.max(
                        max,
                        trait.effect?.combatDamageReduction ?? 0,
                    );
                }, 0) ?? 0;
            const totalReduction = Math.min(
                0.9,
                firstAidReduction + veteranReduction + techCrewReduction,
            );
            const dmg = Math.floor(actualDamage * (1 - totalReduction));
            let newHealth = c.health - dmg;
            if (hasImmortality && newHealth < 1) newHealth = 1;
            c.health = Math.max(0, newHealth);
        });
    });

    phaseStepDodgers.forEach((id) => {
        const member = get().crew.find((c) => c.id === id);
        if (member) {
            get().addLog(
                `👻 ${member.name}: Фазовый шаг! Урон поглощён`,
                "info",
            );
        }
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
