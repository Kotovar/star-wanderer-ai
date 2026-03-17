import type { GameStore, WeaponType } from "@/game/types";
import {
    BASE_ACCURACY,
    MIN_ACCURACY,
    MAX_ACCURACY,
    WEAPON_TYPES,
    COMBAT_ACCURACY_MODIFIERS,
    COMBAT_DAMAGE_MODIFIERS,
} from "@/game/constants";

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

    // Combat assignment bonuses
    if (hasOverclock)
        finalDamagePerWeapon = Math.floor(
            finalDamagePerWeapon * COMBAT_DAMAGE_MODIFIERS.OVERCLOCK_BONUS,
        );
    if (hasRapidfire)
        finalDamagePerWeapon = Math.floor(
            finalDamagePerWeapon * COMBAT_DAMAGE_MODIFIERS.RAPIDFIRE_BONUS,
        );

    // Analysis bonus (requires gunner with targeting)
    if (hasAnalysis && hasGunnerWithTargeting) {
        finalDamagePerWeapon = Math.floor(
            finalDamagePerWeapon * COMBAT_DAMAGE_MODIFIERS.ANALYSIS_BONUS,
        );
        get().addLog(`🔬 Анализ уязвимостей: +10% урон по цели`, "info");
    }

    return finalDamagePerWeapon;
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
        const overflow = shieldDmg - actualShieldDmg;

        remainingShields -= actualShieldDmg;
        totalShieldDamage += actualShieldDmg;
        totalModuleDamage += overflow;

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
    armorPenetration: number,
    shieldBonus: number,
): {
    totalShieldDamage: number;
    totalModuleDamage: number;
    remainingShields: number;
    logs: string[];
    missedShots: number;
    plasmaArmorPenetration: number;
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

        const plasmaDmg = finalDamagePerWeapon * damageMultiplier;
        const shieldDmg = Math.floor(plasmaDmg * shieldBonus);
        const actualShieldDmg = Math.min(remainingShields, shieldDmg);
        const overflow = plasmaDmg - Math.min(remainingShields, plasmaDmg);

        remainingShields -= actualShieldDmg;
        totalShieldDamage += actualShieldDmg;
        totalModuleDamage += overflow;

        if (enemyShields > 0) {
            logs.push(`Плазма: -${actualShieldDmg} щитам`);
            if (overflow > 0) logs.push(`(перелёт: ${overflow})`);
        }
    }

    return {
        totalShieldDamage,
        totalModuleDamage,
        remainingShields,
        logs,
        missedShots,
        plasmaArmorPenetration: armorPenetration,
    };
}

/**
 * Processes drones weapon damage (fires twice per weapon)
 */
export function processDronesDamage(
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

    // Drones fire twice per weapon
    const totalShots = weaponCount * 2;

    for (let i = 0; i < totalShots; i++) {
        if (Math.random() > accuracy) {
            missedShots++;
            continue;
        }

        const droneDmg = finalDamagePerWeapon * damageMultiplier;
        const shieldDmg = Math.min(remainingShields, droneDmg);
        const overflow = droneDmg - shieldDmg;

        remainingShields -= shieldDmg;
        totalShieldDamage += shieldDmg;
        totalModuleDamage += overflow;

        if (enemyShields > 0 && shieldDmg > 0) {
            logs.push(`Дрон: -${shieldDmg} щитам`);
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
        const overflow = antimatterDmg - Math.min(remainingShields, antimatterDmg);

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
