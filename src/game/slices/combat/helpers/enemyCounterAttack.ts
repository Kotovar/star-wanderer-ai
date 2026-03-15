import type { GameState, GameStore, Module } from "@/game/types";
import { getArtifactEffectValue, findActiveArtifact } from "@/game/artifacts";
import { ARTIFACT_TYPES } from "@/game/constants";
import { PILOT_EVASION_COMBAT_EXP } from "@/game/constants/experience";
import { getTotalEvasion } from "@/game/slices/ship/helpers/getTotalEvasion";
import { applyModuleDamage } from "./moduleDamage";
import { processBossRegeneration } from "./bossAbilities";
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

    // Apply damage
    if (state.ship.shields > 0) {
        applyDamageWithShields(state, set, get, eDmg, tgt);
    } else {
        applyDamageNoShields(state, set, get, eDmg, tgt);
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
 */
export function applyDamageWithShields(
    state: GameState,
    set: (fn: (s: GameState) => void) => void,
    get: () => GameStore,
    eDmg: number,
    tgt: Module,
) {
    const sDmg = Math.min(get().ship.shields, eDmg);
    set((s) => ({ ship: { ...s.ship, shields: s.ship.shields - sDmg } }));
    get().addLog(`Враг по щитам: -${sDmg}`, "warning");

    const overflow = eDmg - sDmg;
    if (overflow > 0) {
        applyModuleDamage(state, set, get, overflow, tgt, false);
    }
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
) {
    applyModuleDamage(state, set, get, eDmg, tgt, true);
}
