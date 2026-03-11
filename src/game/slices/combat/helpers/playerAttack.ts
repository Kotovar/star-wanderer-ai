import type { GameState, GameStore } from "@/game/types";
import { getArtifactEffectValue, findActiveArtifact } from "@/game/artifacts";
import { ARTIFACT_TYPES, WEAPON_TYPES } from "@/game/constants";
import { isModuleActive } from "@/lib";
import { getActiveAssignment } from "@/game/crew";
import {
    getWeaponAccuracy,
    calculateFinalDamagePerWeapon,
    calculateAccuracyModifier,
    processLaserDamage,
    processKineticDamage,
    processMissileDamage,
} from "./playerDamage";
import { handleVictory } from "./playerVictory";
import { handleEnemyCounterAttack } from "./enemyCounterAttack";
import { applyAlienPresencePenalty } from "./alienPresence";
import { BASE_CRIT_CHANCE, BASE_CRIT_MULTIPLIER } from "@/game/constants";

/**
 * Executes player attack on enemy
 */
export function executePlayerAttack(
    state: GameState,
    set: (fn: (s: GameState) => void) => void,
    get: () => GameStore,
) {
    if (!state.currentCombat) return;

    // Get weapon bays and crew
    const weaponBays = state.ship.modules.filter(
        (m) => m.type === "weaponbay" && isModuleActive(m),
    );
    const crewInWeaponBays = state.crew.filter(
        (c) =>
            weaponBays.some((wb) => wb.id === c.moduleId) &&
            (c.profession === "gunner" ||
                c.profession === "engineer" ||
                (c.profession === "pilot" &&
                    getActiveAssignment(c, true) === "targeting")),
    );
    const hasGunner = crewInWeaponBays.some((c) => c.profession === "gunner");
    const hasEngineer = crewInWeaponBays.some(
        (c) => c.profession === "engineer",
    );

    // Determine target
    let tgtMod = state.currentCombat.enemy.modules.find(
        (m) => m.id === state.currentCombat?.enemy.selectedModule,
    );
    const hasTargetingGunner = crewInWeaponBays.some(
        (c) => c.profession === "gunner" && c.combatAssignment === "targeting",
    );

    if (!hasGunner) {
        const aliveModules = state.currentCombat.enemy.modules.filter(
            (m) => m.health > 0,
        );
        if (aliveModules.length === 0) return;
        tgtMod = aliveModules[Math.floor(Math.random() * aliveModules.length)];
        get().addLog(`Случайная цель: ${tgtMod.name}`, "warning");
    } else if (!hasTargetingGunner) {
        const aliveModules = state.currentCombat.enemy.modules.filter(
            (m) => m.health > 0,
        );
        if (aliveModules.length === 0) return;
        tgtMod = aliveModules[Math.floor(Math.random() * aliveModules.length)];
    } else if (!tgtMod || tgtMod.health <= 0) {
        get().addLog("Выберите цель!", "error");
        return;
    }

    // Count weapons
    const weaponCounts = { kinetic: 0, laser: 0, missile: 0 };
    const baseWeaponDamage = get().getTotalDamage().total;

    state.ship.modules.forEach((m) => {
        if (m.type === "weaponbay" && m.weapons) {
            m.weapons.forEach((w) => {
                if (w && WEAPON_TYPES[w.type]) weaponCounts[w.type]++;
            });
        }
    });

    const totalWeapons =
        weaponCounts.kinetic + weaponCounts.laser + weaponCounts.missile;
    if (totalWeapons === 0) return;

    // Combat assignments
    const hasTargeting = state.crew.some(
        (c) => c.combatAssignment === "targeting",
    );
    const hasOverclock = state.crew.some(
        (c) => c.combatAssignment === "overclock",
    );
    const hasRapidfire = state.crew.some(
        (c) => c.combatAssignment === "rapidfire",
    );
    const hasCalibration = state.crew.some(
        (c) => c.combatAssignment === "calibration",
    );
    const hasAnalysis = state.crew.some(
        (c) => c.combatAssignment === "analysis",
    );
    const hasGunnerWithTargeting = hasTargeting && hasGunner;

    // Calculate damage
    const finalDamagePerWeapon = calculateFinalDamagePerWeapon(
        baseWeaponDamage,
        hasGunner,
        hasOverclock,
        hasRapidfire,
        hasAnalysis,
        hasTargeting,
        hasGunnerWithTargeting,
        get,
    );

    // Critical hit calculation
    let totalCritChance = BASE_CRIT_CHANCE;
    const criticalMatrix = findActiveArtifact(
        state.artifacts,
        ARTIFACT_TYPES.CRITICAL_MATRIX,
    );
    if (criticalMatrix) {
        const critChanceBonus = getArtifactEffectValue(criticalMatrix, state);
        totalCritChance += critChanceBonus;
        get().addLog(
            `💎 Критическая Матрица: +${Math.round(critChanceBonus * 100)}% шанс крита`,
            "info",
        );
    }

    let critMultiplier = BASE_CRIT_MULTIPLIER;
    const overloadMatrix = findActiveArtifact(
        state.artifacts,
        ARTIFACT_TYPES.OVERLOAD_MATRIX,
    );
    if (overloadMatrix) {
        const critDamageBonus = getArtifactEffectValue(overloadMatrix, state);
        critMultiplier += critDamageBonus;
        get().addLog(
            `💥 Матрица Перегрузки: +${Math.round(critDamageBonus * 100)}% крит. урон`,
            "info",
        );
    }

    let isCrit = false;
    if (Math.random() < totalCritChance) {
        isCrit = true;
        get().addLog(
            `💥 КРИТИЧЕСКИЙ УДАР! x${critMultiplier.toFixed(1)} урон!`,
            "combat",
        );
    }

    // Accuracy calculation
    const aiCoreModules = state.ship.modules.filter(
        (m) => m.type === "ai_core" && isModuleActive(m),
    ).length;

    const targetingCore = findActiveArtifact(
        state.artifacts,
        ARTIFACT_TYPES.TARGETING_CORE,
    );
    const accuracyBonus = targetingCore
        ? getArtifactEffectValue(targetingCore, state) / 100
        : 0;

    let crewAccuracyPenalties = 0;
    state.crew.forEach((c) => {
        c.traits?.forEach((trait) => {
            if (trait.effect?.accuracyPenalty)
                crewAccuracyPenalties -= Number(trait.effect.accuracyPenalty);
        });
    });

    const accuracyModifier = calculateAccuracyModifier(
        hasGunner,
        crewInWeaponBays,
        hasTargeting,
        hasRapidfire,
        hasCalibration,
        hasEngineer,
        aiCoreModules,
        accuracyBonus,
        crewAccuracyPenalties,
        get,
    );

    const getWeaponAccuracyFn = (weaponType: string) =>
        getWeaponAccuracy(
            weaponType as "laser" | "kinetic" | "missile",
            accuracyModifier,
        );

    // Calculate damage by weapon type
    let totalShieldDamage = 0;
    let totalModuleDamage = 0;
    const logs: string[] = [];
    const missedShots = { laser: 0, kinetic: 0, missile: 0 };

    const enemyShields = state.currentCombat.enemy.shields;
    let remainingShields = enemyShields;
    const damageMultiplier = isCrit ? critMultiplier : 1;

    // Process each weapon type
    if (weaponCounts.laser > 0) {
        const result = processLaserDamage(
            weaponCounts.laser,
            finalDamagePerWeapon,
            damageMultiplier,
            remainingShields,
            enemyShields,
            getWeaponAccuracyFn("laser"),
        );
        totalShieldDamage += result.totalShieldDamage;
        totalModuleDamage += result.totalModuleDamage;
        remainingShields = result.remainingShields;
        logs.push(...result.logs);
        missedShots.laser = result.missedShots;
    }

    let kineticArmorPenetration = 0;
    if (weaponCounts.kinetic > 0) {
        const result = processKineticDamage(
            weaponCounts.kinetic,
            finalDamagePerWeapon,
            damageMultiplier,
            remainingShields,
            enemyShields,
            getWeaponAccuracyFn("kinetic"),
            WEAPON_TYPES.kinetic.armorPenetration ?? 0.5,
        );
        totalShieldDamage += result.totalShieldDamage;
        totalModuleDamage += result.totalModuleDamage;
        remainingShields = result.remainingShields;
        logs.push(...result.logs);
        missedShots.kinetic = result.missedShots;
        kineticArmorPenetration = result.kineticArmorPenetration;
    }

    if (weaponCounts.missile > 0) {
        const result = processMissileDamage(
            weaponCounts.missile,
            finalDamagePerWeapon,
            damageMultiplier,
            remainingShields,
            enemyShields,
            getWeaponAccuracyFn("missile"),
            WEAPON_TYPES.missile.interceptChance ?? 0.2,
            accuracyModifier,
        );
        totalShieldDamage += result.totalShieldDamage;
        totalModuleDamage += result.totalModuleDamage;
        remainingShields = result.remainingShields;
        logs.push(...result.logs);
        missedShots.missile = result.missedShots;
    }

    // Log missed shots
    if (missedShots.laser > 0)
        logs.push(`❌ ${missedShots.laser} лазер(а) промахнул(ись)!`);
    if (missedShots.kinetic > 0)
        logs.push(
            `❌ ${missedShots.kinetic} кинетических снаряда промахнулось!`,
        );
    if (missedShots.missile > 0)
        logs.push(`❌ ${missedShots.missile} ракета(ы) промахнул(ись)!`);

    // Apply shield damage
    if (totalShieldDamage > 0) {
        set((s) => {
            if (!s.currentCombat) return;
            s.currentCombat.enemy.shields = Math.max(
                0,
                enemyShields - totalShieldDamage,
            );
        });
        get().addLog(`Урон щитам врага: ${totalShieldDamage}`, "combat");
    }

    // Apply module damage
    if (totalModuleDamage > 0 || weaponCounts.kinetic > 0) {
        let moduleDefense = tgtMod.defense ?? 0;

        if (weaponCounts.kinetic > 0 && kineticArmorPenetration > 0) {
            moduleDefense = Math.floor(
                moduleDefense * (1 - kineticArmorPenetration),
            );
            logs.push(
                `🛡 Броня снижена на 50%: ${tgtMod.defense} → ${moduleDefense}`,
            );
        }

        if (hasOverclock) {
            moduleDefense = Math.floor(moduleDefense * 0.9);
            logs.push(
                `⚠️ Перегрузка: броня -10% (${tgtMod.defense} → ${moduleDefense})`,
            );
        }

        const finalDamage = Math.max(1, totalModuleDamage - moduleDefense);

        set((s) => {
            if (!s.currentCombat) return;
            const mod = s.currentCombat.enemy.modules.find(
                (m) => m.id === tgtMod.id,
            );
            if (mod) mod.health = Math.max(0, mod.health - finalDamage);
        });

        get().addLog(
            `Пробитие! Модуль "${tgtMod.name}": -${finalDamage}%${weaponCounts.kinetic > 0 ? ` (броня -${moduleDefense})` : ""}`,
            "combat",
        );
    }

    logs.forEach((log) => get().addLog(log, "combat"));

    // Check victory
    const updatedCombat = get().currentCombat;
    if (
        updatedCombat &&
        updatedCombat.enemy.modules.every((m) => m.health <= 0)
    ) {
        handleVictory(state, set, get, updatedCombat, weaponBays);
        return;
    }

    // Enemy counter-attack
    handleEnemyCounterAttack(state, set, get);

    // Clear selection
    set((s) => {
        if (!s.currentCombat) return;
        s.currentCombat.enemy.selectedModule = null;
    });

    get().updateShipStats();
    get().nextTurn();

    // Alien presence
    applyAlienPresencePenalty(set, get);
}
