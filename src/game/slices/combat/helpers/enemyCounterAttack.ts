import type { GameState, GameStore, Module } from "@/game/types";
import { getArtifactEffectValue, findActiveArtifact } from "@/game/artifacts";
import { ARTIFACT_TYPES } from "@/game/constants";
import { COMBAT_ACCURACY_MODIFIERS } from "@/game/constants/combat";
import { PILOT_EVASION_COMBAT_EXP } from "@/game/constants/experience";
import { getTotalEvasion } from "@/game/slices/ship/helpers/getTotalEvasion";
import { applyModuleDamage } from "./moduleDamage";
import { getBossAttackModifiers, processBossRegeneration } from "./bossAbilities";
import {
    DEFAULT_MODULE_PRIORITY,
    MODULE_HEALTH_PRIORITY,
    MODULE_TARGET_PRIORITY,
} from "./combatConstants";

/**
 * Handles enemy counter-attack after player attack
 */
export function handleEnemyCounterAttack(
    state: GameState,
    set: (fn: (s: GameState) => void) => void,
    get: () => GameStore,
) {
    const combat = state.currentCombat;
    if (!combat) return;

    const eDmg = combat.enemy.modules.reduce(
        (s, m) => s + (m.health > 0 ? (m.damage ?? 0) : 0),
        0,
    );

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
        ? getBossAttackModifiers(aliveBossMods, combat.enemy.bossAttackCount ?? 0)
        : null;

    // Apply guaranteed crit and multi_hit
    let finalDamage = eDmg;
    if (bossModifiers) {
        if (bossModifiers.isGuaranteedCrit) {
            finalDamage = Math.floor(finalDamage * 1.5);
            get().addLog(`💥 Гарантированный крит босса!`, "error");
        }
        finalDamage = Math.floor(finalDamage * bossModifiers.multiHitCount);
    }

    // Evasion check
    const evasionChance = getTotalEvasion(state) / 100;
    if (evasionChance > 0 && Math.random() < evasionChance) {
        const pilot = state.crew.find((c) => c.profession === "pilot");
        const hasEvasion = state.crew.some(
            (c) => c.combatAssignment === "evasion",
        );
        const evasionSource = hasEvasion
            ? `Боевые маневры (${Math.round(evasionChance * 100)}% шанс)`
            : `Уклонение (${Math.round(evasionChance * 100)}% шанс)`;
        get().addLog(
            `✈️ ${pilot ? `Пилот ${pilot.name} уклонился` : `Корабль уклонился`} от атаки! ${evasionSource}`,
            "info",
        );
        if (pilot) get().gainExp(pilot, PILOT_EVASION_COMBAT_EXP);
        return;
    }

    // Sabotage check (scales with scout level)
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

    // Select target module
    const activeMods = state.ship.modules.filter((m) => m.health > 0);
    const tgt = selectTargetModule(activeMods, get);
    if (!tgt) return;

    // Mirror Shield check
    const mirrorShield = findActiveArtifact(
        state.artifacts,
        ARTIFACT_TYPES.MIRROR_SHIELD,
    );
    if (
        mirrorShield &&
        Math.random() < getArtifactEffectValue(mirrorShield, state)
    ) {
        reflectAttack(state, set, get, eDmg, combat);
        return;
    }

    // Phase Shield: 20% chance to nullify attack if shields >= 20% of max
    if (
        state.research.researchedTechs.includes("phase_shield") &&
        state.ship.shields > 0 &&
        state.ship.maxShields > 0 &&
        state.ship.shields >= state.ship.maxShields * 0.2 &&
        Math.random() < 0.2
    ) {
        get().addLog(`🔷 Фазовый щит! Атака полностью поглощена! (20% шанс)`, "info");
        return;
    }

    // Apply damage
    const shieldPierce = bossModifiers?.shieldPiercePercent ?? 0;
    const ignoreDefense = bossModifiers?.ignoreDefense ?? false;
    if (state.ship.shields > 0) {
        applyDamageWithShields(state, set, get, finalDamage, tgt, shieldPierce, ignoreDefense);
    } else {
        applyDamageNoShields(state, set, get, finalDamage, tgt, ignoreDefense);
    }

    // Increment boss attack count
    if (combat.enemy.isBoss) {
        set((s) => {
            if (!s.currentCombat) return;
            s.currentCombat.enemy.bossAttackCount =
                (s.currentCombat.enemy.bossAttackCount ?? 0) + 1;
        });
    }

    // Shield break
    if (bossModifiers && bossModifiers.shieldBreakAmount > 0 && get().ship.shields > 0) {
        set((s) => {
            s.ship.shields = Math.max(0, s.ship.shields - bossModifiers.shieldBreakAmount);
        });
        get().addLog(`⚡ Разрушение щитов: -${bossModifiers.shieldBreakAmount}`, "warning");
    }

    // Heal on damage
    if (bossModifiers && bossModifiers.healOnDamagePercent > 0) {
        const healAmount = Math.floor((finalDamage * bossModifiers.healOnDamagePercent) / 100);
        if (healAmount > 0) {
            set((s) => {
                if (!s.currentCombat) return;
                s.currentCombat.enemy.modules.forEach((m) => {
                    if (m.health > 0)
                        m.health = Math.min(m.maxHealth ?? 100, m.health + healAmount);
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
        get().addLog(`⏭️ Пропуск хода! Следующая атака будет пропущена!`, "error");
    }

    // Remove dead crew
    const deadCrew = get().crew.filter((c) => c.health <= 0);
    if (deadCrew.length > 0) {
        set((s) => ({ crew: s.crew.filter((c) => c.health > 0) }));
        get().addLog(
            `☠️ Потери экипажа: ${deadCrew.map((c) => c.name).join(", ")}`,
            "error",
        );
    }

    // Boss regeneration
    processBossRegeneration(state, set, get);

    // Enemy shield regeneration (regular enemies only — driven by alive shield modules)
    processEnemyShieldRegen(set, get);

    get().checkGameOver();
}

/**
 * Selects target module by priority
 */
export function selectTargetModule(
    activeMods: Module[],
    get: () => GameStore,
): Module | null {
    if (activeMods.length === 0) return null;

    const getModuleTargetPriority = (m: Module): number => {
        let priority = 0;
        const crewInModule = get().crew.filter((c) => c.moduleId === m.id);

        priority = MODULE_TARGET_PRIORITY[m.type] ?? DEFAULT_MODULE_PRIORITY;

        if (m.health < MODULE_HEALTH_PRIORITY.LOW)
            priority += MODULE_HEALTH_PRIORITY.LOW_BONUS;
        else if (m.health < MODULE_HEALTH_PRIORITY.MIDDLE)
            priority += MODULE_HEALTH_PRIORITY.MIDDLE_BONUS;
        else if (m.health < MODULE_HEALTH_PRIORITY.HIGH)
            priority += MODULE_HEALTH_PRIORITY.HIGH_BONUS;

        priority += crewInModule.length * MODULE_HEALTH_PRIORITY.LENGTH_BONUS;
        priority += Math.random() * MODULE_HEALTH_PRIORITY.RANDOM_BONUS;

        return priority;
    };

    const sortedMods = [...activeMods].sort(
        (a, b) => getModuleTargetPriority(b) - getModuleTargetPriority(a),
    );
    return sortedMods[0];
}

/**
 * Reflects attack with Mirror Shield
 */
export function reflectAttack(
    state: GameState,
    set: (fn: (s: GameState) => void) => void,
    get: () => GameStore,
    eDmg: number,
    combat: NonNullable<GameState["currentCombat"]>,
) {
    const aliveModules = combat.enemy.modules.filter((m) => m.health > 0);
    if (aliveModules.length === 0) return;

    const reflectedTarget =
        aliveModules[Math.floor(Math.random() * aliveModules.length)];
    let remainingDamage = eDmg;

    if (combat.enemy.shields > 0) {
        const shieldAbsorb = Math.min(combat.enemy.shields, remainingDamage);
        set((s) => {
            if (!s.currentCombat) return;
            s.currentCombat.enemy.shields -= shieldAbsorb;
        });
        remainingDamage -= shieldAbsorb;
        get().addLog(`🛡️ Щиты врага поглотили: -${shieldAbsorb}`, "info");
    }

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
    }
}

/**
 * Applies damage with shields
 * @param shieldPiercePercent - % of damage that bypasses shields
 * @param ignoreDefense - bypass module armor
 */
export function applyDamageWithShields(
    state: GameState,
    set: (fn: (s: GameState) => void) => void,
    get: () => GameStore,
    eDmg: number,
    tgt: Module,
    shieldPiercePercent = 0,
    ignoreDefense = false,
) {
    // Split damage: piercing portion bypasses shields
    const piercingDamage = shieldPiercePercent > 0
        ? Math.floor((eDmg * shieldPiercePercent) / 100)
        : 0;
    const normalDamage = eDmg - piercingDamage;

    if (piercingDamage > 0) {
        get().addLog(`🔱 Пробитие щитов: ${piercingDamage} урона игнорирует щиты`, "warning");
        applyModuleDamage(state, set, get, piercingDamage, tgt);
    }

    if (normalDamage > 0) {
        const sDmg = Math.min(get().ship.shields, normalDamage);
        set((s) => ({ ship: { ...s.ship, shields: s.ship.shields - sDmg } }));
        get().addLog(`Враг по щитам: -${sDmg}`, "warning");

        const overflow = normalDamage - sDmg;
        if (overflow > 0) {
            applyModuleDamage(state, set, get, overflow, tgt, ignoreDefense);
        }
    }
}

/**
 * Regenerates enemy shields each turn based on alive shield modules.
 * Skips bosses (they have their own ability-based shield mechanics).
 */
function processEnemyShieldRegen(
    set: (fn: (s: GameState) => void) => void,
    get: () => GameStore,
) {
    const combat = get().currentCombat;
    if (!combat) return;
    const regenRate = combat.enemy.shieldRegenRate;
    if (!regenRate || regenRate <= 0) return;
    const current = combat.enemy.shields;
    const max = combat.enemy.maxShields;
    if (current >= max) return;

    const restored = Math.min(regenRate, max - current);
    set((s) => {
        if (!s.currentCombat) return;
        s.currentCombat.enemy.shields = current + restored;
    });
    get().addLog(
        `🛡 Щиты врага восстановились: +${restored} (${current + restored}/${max})`,
        "info",
    );
}

/**
 * Applies damage without shields
 */
export function applyDamageNoShields(
    state: GameState,
    set: (fn: (s: GameState) => void) => void,
    get: () => GameStore,
    eDmg: number,
    tgt: Module,
    ignoreDefense = false,
) {
    applyModuleDamage(state, set, get, eDmg, tgt, ignoreDefense);
}
