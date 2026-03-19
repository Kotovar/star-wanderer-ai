import type { GameState, GameStore, WeaponType } from "@/game/types";
import {
    BASE_ACCURACY,
    MIN_ACCURACY,
    MAX_ACCURACY,
    WEAPON_TYPES,
    COMBAT_ACCURACY_MODIFIERS,
    COMBAT_DAMAGE_MODIFIERS,
    ARTIFACT_TYPES,
} from "@/game/constants";
import { isModuleActive } from "@/game/modules/utils";
import {
    findActiveArtifact,
    getArtifactEffectValue,
} from "@/game/artifacts/utils";

/**
 * Calculates weapon accuracy with all modifiers
 */
export function getWeaponAccuracy(
    weaponType: WeaponType,
    accuracyModifier: number,
): number {
    const base = BASE_ACCURACY[weaponType] ?? 0.85;
    return Math.max(
        MIN_ACCURACY,
        Math.min(MAX_ACCURACY, base + accuracyModifier),
    );
}

/**
 * Calculates final damage per weapon with all bonuses
 */
export function calculateFinalDamagePerWeapon(
    baseWeaponDamage: number,
    hasGunner: boolean,
    hasOverclock: boolean,
    hasRapidfire: boolean,
    hasAnalysis: boolean,
    hasTargeting: boolean,
    hasGunnerWithTargeting: boolean,
    get: () => GameStore,
): number {
    let finalDamagePerWeapon = hasGunner
        ? Math.floor(baseWeaponDamage * COMBAT_DAMAGE_MODIFIERS.GUNNER_BONUS)
        : Math.floor(
              baseWeaponDamage * COMBAT_DAMAGE_MODIFIERS.NO_GUNNER_PENALTY,
          );

    // Combat assignment bonuses (scale with crew level: base + level * 1%)
    if (hasOverclock) {
        const engineerLevel =
            get().crew.find((c) => c.combatAssignment === "overclock")?.level ?? 1;
        finalDamagePerWeapon = Math.floor(
            finalDamagePerWeapon * (1 + 0.15 + engineerLevel * 0.01),
        );
    }
    if (hasRapidfire) {
        const gunnerLevel =
            get().crew.find((c) => c.combatAssignment === "rapidfire")?.level ?? 1;
        finalDamagePerWeapon = Math.floor(
            finalDamagePerWeapon * (1 + 0.25 + gunnerLevel * 0.01),
        );
    }

    // Analysis bonus (requires gunner with targeting, scales with scientist level)
    if (hasAnalysis && hasGunnerWithTargeting) {
        const scientistLevel =
            get().crew.find((c) => c.combatAssignment === "analysis")?.level ?? 1;
        finalDamagePerWeapon = Math.floor(
            finalDamagePerWeapon * (1 + 0.10 + scientistLevel * 0.01),
        );
        get().addLog(`🔬 Анализ уязвимостей: +${10 + scientistLevel}% урон по цели`, "info");
    }

    return finalDamagePerWeapon;
}

/**
 * Pure (no-logging) accuracy modifier computation from full game state.
 * Single source of truth used by both combat logic and UI.
 */
export function computeAccuracyModifier(state: GameState): number {
    const weaponBayIds = new Set(
        state.ship.modules
            .filter((m) => m.type === "weaponbay" && isModuleActive(m))
            .map((m) => m.id),
    );
    const crewInWeaponBays = state.crew.filter((c) =>
        weaponBayIds.has(c.moduleId),
    );

    let modifier = 0;

    const hasGunner =
        crewInWeaponBays.some((c) => c.profession === "gunner") ||
        state.crew.some((c) => c.combatAssignment === "targeting");

    if (!hasGunner) {
        modifier += COMBAT_ACCURACY_MODIFIERS.NO_GUNNER_PENALTY;
    } else {
        const gunnerInBay = crewInWeaponBays.find(
            (c) => c.profession === "gunner",
        );
        if (gunnerInBay) {
            const gunnerLevel = gunnerInBay.level || 1;
            modifier += Math.min(
                COMBAT_ACCURACY_MODIFIERS.GUNNER_LEVEL_MAX_BONUS,
                gunnerLevel * COMBAT_ACCURACY_MODIFIERS.GUNNER_LEVEL_BONUS,
            );
        }
    }

    if (state.crew.some((c) => c.combatAssignment === "targeting"))
        modifier += COMBAT_ACCURACY_MODIFIERS.TARGETING_BONUS;
    if (state.crew.some((c) => c.combatAssignment === "rapidfire"))
        modifier += COMBAT_ACCURACY_MODIFIERS.RAPIDFIRE_PENALTY;

    const engineerWithCalibration = crewInWeaponBays.find(
        (c) => c.profession === "engineer" && c.combatAssignment === "calibration",
    );
    if (engineerWithCalibration)
        modifier +=
            COMBAT_ACCURACY_MODIFIERS.CALIBRATION_BONUS +
            (engineerWithCalibration.level ?? 1) * 0.01;

    const aiCoreCount = state.ship.modules.filter(
        (m) => m.type === "ai_core" && isModuleActive(m),
    ).length;
    if (aiCoreCount > 0)
        modifier += aiCoreCount * COMBAT_ACCURACY_MODIFIERS.AI_CORE_BONUS;

    const targetingCore = findActiveArtifact(
        state.artifacts,
        ARTIFACT_TYPES.TARGETING_CORE,
    );
    if (targetingCore)
        modifier += getArtifactEffectValue(targetingCore, state) / 100;

    state.crew.forEach((c) => {
        const isGunnerInWeaponBay =
            c.profession === "gunner" && weaponBayIds.has(c.moduleId);
        c.traits?.forEach((trait) => {
            if (trait.effect?.accuracyPenalty && isGunnerInWeaponBay)
                modifier -= Number(trait.effect.accuracyPenalty);
            if (trait.effect?.accuracyBonus && isGunnerInWeaponBay)
                modifier += Number(trait.effect.accuracyBonus);
        });
    });

    // Xenosymbiont merge into weapon bay
    const xenoMerge = state.crew.find(
        (c) => c.isMerged && c.mergedModuleId !== null,
    );
    if (xenoMerge) {
        const mergedModule = state.ship.modules.find(
            (m) => m.id === xenoMerge.mergedModuleId,
        );
        if (mergedModule?.type === "weaponbay") modifier += 0.05;
    }

    return modifier;
}

/**
 * Calculates accuracy modifier from all sources
 */
export function calculateAccuracyModifier(
    hasGunner: boolean,
    crewInWeaponBays: { profession: string; level?: number; name: string }[],
    hasTargeting: boolean,
    hasRapidfire: boolean,
    hasCalibration: boolean,
    hasEngineer: boolean,
    aiCoreModules: number,
    targetingCoreBonus: number,
    crewAccuracyPenalties: number,
    get: () => GameStore,
): number {
    let accuracyModifier = 0;

    if (!hasGunner) {
        accuracyModifier += COMBAT_ACCURACY_MODIFIERS.NO_GUNNER_PENALTY;
    } else {
        const gunnerInWeaponBay = crewInWeaponBays.find(
            (c) => c.profession === "gunner",
        );
        if (gunnerInWeaponBay) {
            const gunnerLevel = gunnerInWeaponBay.level || 1;
            const gunnerAccuracyBonus = Math.min(
                COMBAT_ACCURACY_MODIFIERS.GUNNER_LEVEL_MAX_BONUS,
                gunnerLevel * COMBAT_ACCURACY_MODIFIERS.GUNNER_LEVEL_BONUS,
            );
            accuracyModifier += gunnerAccuracyBonus;
            get().addLog(
                `🎯 Стрелок ${gunnerInWeaponBay.name} (Ур.${gunnerLevel}): +${Math.round(gunnerAccuracyBonus * 100)}% точность`,
                "info",
            );
        }
    }

    if (hasTargeting)
        accuracyModifier += COMBAT_ACCURACY_MODIFIERS.TARGETING_BONUS;
    if (hasRapidfire)
        accuracyModifier += COMBAT_ACCURACY_MODIFIERS.RAPIDFIRE_PENALTY;
    if (hasCalibration && hasEngineer)
        accuracyModifier += COMBAT_ACCURACY_MODIFIERS.CALIBRATION_BONUS;

    if (aiCoreModules > 0) {
        accuracyModifier +=
            aiCoreModules * COMBAT_ACCURACY_MODIFIERS.AI_CORE_BONUS;
        get().addLog(`🤖 ИИ Ядро: +${aiCoreModules * 5}% точность`, "info");
    }

    if (targetingCoreBonus > 0) {
        accuracyModifier += targetingCoreBonus;
        get().addLog(
            `🎯 Ядро Прицеливания: +${Math.round(targetingCoreBonus * 100)}% точность`,
            "info",
        );
    }

    accuracyModifier += crewAccuracyPenalties;

    return accuracyModifier;
}

/**
 * Processes laser weapon damage
 */
export function processLaserDamage(
    weaponCount: number,
    finalDamagePerWeapon: number,
    damageMultiplier: number,
    remainingShields: number,
    enemyShields: number,
    accuracy: number,
): {
    totalShieldDamage: number;
    totalModuleDamage: number;
    remainingShields: number;
    logs: string[];
    missedShots: number;
} {
    let totalShieldDamage = 0;
    let totalModuleDamage = 0;
    const logs: string[] = [];
    let missedShots = 0;

    for (let i = 0; i < weaponCount; i++) {
        if (Math.random() > accuracy) {
            missedShots++;
            continue;
        }

        const laserDmg = finalDamagePerWeapon * damageMultiplier;
        const shieldDmg = Math.floor(
            laserDmg * (WEAPON_TYPES.laser.shieldBonus ?? 1.2),
        );
        const actualShieldDmg = Math.min(remainingShields, shieldDmg);
        remainingShields -= actualShieldDmg;
        totalShieldDamage += actualShieldDmg;

        // Overflow to modules uses base damage (no shield bonus for module hits)
        let overflow = 0;
        if (actualShieldDmg < shieldDmg) {
            const fractionNotShielded = 1 - actualShieldDmg / shieldDmg;
            overflow = Math.floor(laserDmg * fractionNotShielded);
            totalModuleDamage += overflow;
        }

        if (enemyShields > 0) {
            logs.push(`Лазер: -${actualShieldDmg} щитам`);
            if (overflow > 0) logs.push(`(перелёт: ${overflow})`);
        }
    }

    return {
        totalShieldDamage,
        totalModuleDamage,
        remainingShields,
        logs,
        missedShots,
    };
}

/**
 * Processes kinetic weapon damage
 */
export function processKineticDamage(
    weaponCount: number,
    finalDamagePerWeapon: number,
    damageMultiplier: number,
    remainingShields: number,
    enemyShields: number,
    accuracy: number,
    armorPenetration: number,
): {
    totalShieldDamage: number;
    totalModuleDamage: number;
    remainingShields: number;
    logs: string[];
    missedShots: number;
    kineticArmorPenetration: number;
} {
    let totalShieldDamage = 0;
    let totalModuleDamage = 0;
    const logs: string[] = [];
    let missedShots = 0;

    for (let i = 0; i < weaponCount; i++) {
        if (Math.random() > accuracy) {
            missedShots++;
            continue;
        }

        const kineticDmg = finalDamagePerWeapon * damageMultiplier;
        const shieldDmg = Math.min(remainingShields, kineticDmg);
        const overflow = kineticDmg - shieldDmg;

        remainingShields -= shieldDmg;
        totalShieldDamage += shieldDmg;
        totalModuleDamage += overflow;

        if (enemyShields > 0 && shieldDmg > 0) {
            logs.push(`Кинетика: -${shieldDmg} щитам`);
        }
    }

    return {
        totalShieldDamage,
        totalModuleDamage,
        remainingShields,
        logs,
        missedShots,
        kineticArmorPenetration: armorPenetration,
    };
}

/**
 * Processes missile weapon damage
 */
export function processMissileDamage(
    weaponCount: number,
    finalDamagePerWeapon: number,
    damageMultiplier: number,
    remainingShields: number,
    enemyShields: number,
    accuracy: number,
    interceptChance: number,
    accuracyModifier: number,
): {
    totalShieldDamage: number;
    totalModuleDamage: number;
    remainingShields: number;
    logs: string[];
    missedShots: number;
    missileInterceptedCount: number;
} {
    let totalShieldDamage = 0;
    let totalModuleDamage = 0;
    const logs: string[] = [];
    let missedShots = 0;
    let missileInterceptedCount = 0;

    const baseInterceptChance = interceptChance ?? 0.2;
    const actualInterceptChance = Math.max(
        0.05,
        Math.min(0.5, baseInterceptChance - accuracyModifier),
    );

    for (let i = 0; i < weaponCount; i++) {
        if (Math.random() > accuracy) {
            missedShots++;
            continue;
        }

        if (Math.random() < actualInterceptChance) {
            missileInterceptedCount++;
            continue;
        }

        const missileDmg = finalDamagePerWeapon * damageMultiplier;
        const shieldDmg = Math.min(remainingShields, missileDmg);
        const overflow = missileDmg - shieldDmg;

        remainingShields -= shieldDmg;
        totalShieldDamage += shieldDmg;
        totalModuleDamage += overflow;

        if (enemyShields > 0 && shieldDmg > 0) {
            logs.push(`Ракета: -${shieldDmg} щитам`);
        }
    }

    if (missileInterceptedCount > 0) {
        logs.push(`🛡️ ${missileInterceptedCount} ракета(ы) сбита(ы)!`);
    }

    return {
        totalShieldDamage,
        totalModuleDamage,
        remainingShields,
        logs,
        missedShots,
        missileInterceptedCount,
    };
}

/**
 * Processes plasma weapon damage (hybrid: armor penetration + shield bonus)
 */
export function processPlasmaDamage(
    weaponCount: number,
    finalDamagePerWeapon: number,
    damageMultiplier: number,
    remainingShields: number,
    enemyShields: number,
    accuracy: number,
    shieldBonus: number,
): {
    totalShieldDamage: number;
    totalModuleDamage: number;
    remainingShields: number;
    logs: string[];
    missedShots: number;
    plasmaHitCount: number;
} {
    let totalShieldDamage = 0;
    let totalModuleDamage = 0;
    const logs: string[] = [];
    let missedShots = 0;
    let plasmaHitCount = 0;

    for (let i = 0; i < weaponCount; i++) {
        if (Math.random() > accuracy) {
            missedShots++;
            continue;
        }

        const plasmaDmg = finalDamagePerWeapon * damageMultiplier;
        const shieldDmg = Math.floor(plasmaDmg * shieldBonus);
        const actualShieldDmg = Math.min(remainingShields, shieldDmg);
        const overflow = plasmaDmg - Math.min(remainingShields, plasmaDmg);

        remainingShields -= actualShieldDmg;
        totalShieldDamage += actualShieldDmg;
        totalModuleDamage += overflow;

        // Armor reduction only when plasma actually reaches the module
        if (overflow > 0) plasmaHitCount++;

        if (enemyShields > 0) {
            logs.push(`Плазма: -${actualShieldDmg} щитам`);
            if (overflow > 0) logs.push(`(перелёт: ${Math.floor(overflow)})`);
        }
    }

    return {
        totalShieldDamage,
        totalModuleDamage,
        remainingShields,
        logs,
        missedShots,
        plasmaHitCount,
    };
}

/**
 * Processes drones weapon damage.
 * Fires once per weapon. Each hit grants +5% damage stack (max 20 stacks = +100%).
 * Stack is tracked externally in currentCombat.droneStacks.
 */
export function processDronesDamage(
    weaponCount: number,
    finalDamagePerWeapon: number,
    damageMultiplier: number,
    remainingShields: number,
    enemyShields: number,
    accuracy: number,
    droneStacks: number,
): {
    totalShieldDamage: number;
    totalModuleDamage: number;
    remainingShields: number;
    logs: string[];
    missedShots: number;
    droneHitCount: number;
} {
    let totalShieldDamage = 0;
    let totalModuleDamage = 0;
    const logs: string[] = [];
    let missedShots = 0;
    let droneHitCount = 0;

    const stackBonus = 1 + droneStacks * 0.05;

    if (droneStacks > 0) {
        logs.push(
            `🤖 Дроны разогнаны: x${stackBonus.toFixed(2)} урон (${droneStacks} стак.)`,
        );
    }

    for (let i = 0; i < weaponCount; i++) {
        if (Math.random() > accuracy) {
            missedShots++;
            continue;
        }

        droneHitCount++;
        const droneDmg = Math.floor(
            finalDamagePerWeapon * damageMultiplier * stackBonus,
        );
        const shieldDmg = Math.min(remainingShields, droneDmg);
        const overflow = droneDmg - shieldDmg;

        remainingShields -= shieldDmg;
        totalShieldDamage += shieldDmg;
        totalModuleDamage += overflow;

        if (enemyShields > 0 && shieldDmg > 0) {
            logs.push(`Дрон: -${Math.floor(shieldDmg)} щитам`);
        }
    }

    return {
        totalShieldDamage,
        totalModuleDamage,
        remainingShields,
        logs,
        missedShots,
        droneHitCount,
    };
}

/**
 * Processes antimatter weapon damage (×2.5 shield damage)
 */
export function processAntimatterDamage(
    weaponCount: number,
    finalDamagePerWeapon: number,
    damageMultiplier: number,
    remainingShields: number,
    enemyShields: number,
    accuracy: number,
    shieldBonus: number,
): {
    totalShieldDamage: number;
    totalModuleDamage: number;
    remainingShields: number;
    logs: string[];
    missedShots: number;
} {
    let totalShieldDamage = 0;
    let totalModuleDamage = 0;
    const logs: string[] = [];
    let missedShots = 0;

    for (let i = 0; i < weaponCount; i++) {
        if (Math.random() > accuracy) {
            missedShots++;
            continue;
        }

        const antimatterDmg = finalDamagePerWeapon * damageMultiplier;
        const shieldDmg = Math.floor(antimatterDmg * shieldBonus);
        const actualShieldDmg = Math.min(remainingShields, shieldDmg);
        const overflow =
            antimatterDmg - Math.min(remainingShields, antimatterDmg);

        remainingShields -= actualShieldDmg;
        totalShieldDamage += actualShieldDmg;
        totalModuleDamage += overflow;

        if (enemyShields > 0) {
            logs.push(`Антиматерия: -${actualShieldDmg} щитам`);
            if (overflow > 0) logs.push(`(перелёт: ${overflow})`);
        }
    }

    return {
        totalShieldDamage,
        totalModuleDamage,
        remainingShields,
        logs,
        missedShots,
    };
}

/**
 * Processes quantum torpedo damage (bypasses shields entirely)
 */
export function processQuantumTorpedoDamage(
    weaponCount: number,
    finalDamagePerWeapon: number,
    damageMultiplier: number,
    accuracy: number,
): {
    totalModuleDamage: number;
    logs: string[];
    missedShots: number;
} {
    let totalModuleDamage = 0;
    const logs: string[] = [];
    let missedShots = 0;

    for (let i = 0; i < weaponCount; i++) {
        if (Math.random() > accuracy) {
            missedShots++;
            continue;
        }

        const torpedoDmg = finalDamagePerWeapon * damageMultiplier;
        totalModuleDamage += torpedoDmg;
        logs.push(`Квант. торпеда: ${torpedoDmg} прямо по модулям!`);
    }

    return {
        totalModuleDamage,
        logs,
        missedShots,
    };
}
