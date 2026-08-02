import type { GameState, WeaponType } from "@/game/types";
import type { CombatProjectileResolution } from "@/game/types/combatCinematics";
import { getAugmentationBonus } from "@/game/constants/augmentations";
import { getTechPerkValue } from "@/game/constants/techTree";
import { getGunnerAccuracyBonus, getGunnerCritBonus } from "@/game/crew/combatBonuses";
import {
    BASE_ACCURACY,
    MIN_ACCURACY,
    MAX_ACCURACY,
    WEAPON_TYPES,
    COMBAT_ACCURACY_MODIFIERS,
    COMBAT_DAMAGE_MODIFIERS,
    ARTIFACT_TYPES,
    BASE_CRIT_CHANCE,
    DRONE_STACK_BONUS,
} from "@/game/constants";
import { isModuleActive } from "@/game/modules/utils";
import {
    findActiveArtifact,
    getArtifactEffectValue,
} from "@/game/artifacts/utils";
import { getMergeEffectsBonus } from "@/game/slices/crew/helpers";
import { getProjectileOutcome } from "./combatTimeline";

function recordProjectileHit(
    projectiles: CombatProjectileResolution[],
    weapon: WeaponType,
    shieldDamage: number,
    hullDamage: number,
): void {
    if (shieldDamage <= 0 && hullDamage <= 0) {
        throw new RangeError(`${weapon} hit must deal shield or hull damage`);
    }
    projectiles.push({
        weapon,
        outcome: getProjectileOutcome(shieldDamage, hullDamage),
        shieldDamage,
        hullDamage,
    });
}

function recordProjectileMiss(
    projectiles: CombatProjectileResolution[],
    weapon: WeaponType,
): void {
    projectiles.push({ weapon, outcome: "miss", shieldDamage: 0, hullDamage: 0 });
}

function recordProjectileInterception(
    projectiles: CombatProjectileResolution[],
    weapon: WeaponType,
    interceptorModuleId?: number,
): void {
    projectiles.push({
        weapon,
        outcome: "intercepted",
        shieldDamage: 0,
        hullDamage: 0,
        ...(interceptorModuleId === undefined ? {} : { interceptorModuleId }),
    });
}

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

function getActiveGunners(state: GameState) {
    const activeWeaponBayIds = new Set(
        state.ship.modules
            .filter(
                (module) =>
                    module.type === "weaponbay" && isModuleActive(module),
            )
            .map((module) => module.id),
    );
    return state.crew.filter(
        (crewMember) =>
            crewMember.profession === "gunner" &&
            activeWeaponBayIds.has(crewMember.moduleId),
    );
}

/** Шанс критического удара с теми же усилителями, что использует боевой резолвер. */
export function getPlayerCritChance(state: GameState): number {
    let critChance = BASE_CRIT_CHANCE;
    const criticalMatrix = findActiveArtifact(
        state.artifacts,
        ARTIFACT_TYPES.CRITICAL_MATRIX,
    );
    if (criticalMatrix) {
        critChance += getArtifactEffectValue(criticalMatrix, state);
    }

    const bestGunnerCritBonus = Math.max(
        0,
        ...getActiveGunners(state).map(getGunnerCritBonus),
    );

    return Math.min(0.5, critChance + bestGunnerCritBonus);
}

/**
 * Calculates final damage per weapon with all bonuses
 */
export function calculateFinalDamagePerWeapon(
    baseWeaponDamage: number,
    hasGunner: boolean,
): number {
    return hasGunner
        ? Math.floor(baseWeaponDamage * COMBAT_DAMAGE_MODIFIERS.GUNNER_BONUS)
        : Math.floor(
              baseWeaponDamage * COMBAT_DAMAGE_MODIFIERS.NO_GUNNER_PENALTY,
          );
}

/**
 * Бонусы точности, действующие на весь корабль независимо от отсека
 * (в отличие от бонуса стрелка/калибровки — те зависят от того, кто в
 * КАКОМ именно отсеке, и потому не общие между computeAccuracyModifier
 * и computeBayAccuracyModifier).
 */
function computeGlobalAccuracyBonuses(state: GameState): number {
    let modifier = 0;
    const activeWeaponBayIds = new Set(
        state.ship.modules
            .filter((module) => module.type === "weaponbay" && isModuleActive(module))
            .map((module) => module.id),
    );

    if (
        state.crew.some(
            (c) =>
                c.profession === "gunner" &&
                c.combatAssignment === "targeting" &&
                activeWeaponBayIds.has(c.moduleId),
        )
    )
        modifier += COMBAT_ACCURACY_MODIFIERS.TARGETING_BONUS;
    if (
        state.crew.some(
            (c) =>
                c.profession === "gunner" &&
                c.combatAssignment === "rapidfire" &&
                activeWeaponBayIds.has(c.moduleId),
        )
    )
        modifier += COMBAT_ACCURACY_MODIFIERS.RAPIDFIRE_PENALTY;

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

    const mergeBonus = getMergeEffectsBonus(state.crew, state.ship.modules);
    if (mergeBonus.weaponAccuracy) modifier += mergeBonus.weaponAccuracy / 100;

    return modifier;
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
    const activeGunners = getActiveGunners(state);

    let modifier = 0;

    // Scoped to crewInWeaponBays, not all crew — combatAssignment survives
    // moveCrewMember (only civilian `assignment` is cleared there), so a
    // gunner who left the bay must not keep granting the "has gunner" bonus.
    const hasGunner =
        activeGunners.length > 0 ||
        crewInWeaponBays.some((c) => c.combatAssignment === "targeting");

    if (!hasGunner) {
        modifier += COMBAT_ACCURACY_MODIFIERS.NO_GUNNER_PENALTY;
    }

    const engineerWithCalibration = crewInWeaponBays.find(
        (c) =>
            c.profession === "engineer" && c.combatAssignment === "calibration",
    );
    if (engineerWithCalibration)
        modifier +=
            COMBAT_ACCURACY_MODIFIERS.CALIBRATION_BONUS +
            (engineerWithCalibration.level ?? 1) * 0.01;

    modifier += computeGlobalAccuracyBonuses(state);

    // Общий расчёт берёт одного лучшего стрелка, чтобы дополнительные орудийные
    // отсеки не складывали глобальные бонусы. Локальный per-bay расчёт ниже остаётся.
    const bestGunnerAccuracyBonus = Math.max(
        0,
        ...activeGunners.map(getGunnerAccuracyBonus),
    );
    modifier += bestGunnerAccuracyBonus;

    return modifier;
}

/**
 * Per-bay accuracy modifier: gunner/calibration bonuses scoped to specific bay,
 * global bonuses (AI cores, targeting artifact/assignment, rapidfire) apply to all bays.
 */
export function computeBayAccuracyModifier(state: GameState, bayId: number): number {
    const crewInBay = state.crew.filter((c) => c.moduleId === bayId);
    const gunnerInBay = crewInBay.find((c) => c.profession === "gunner");
    const hasGlobalTargeting = state.crew.some(
        (c) =>
            c.profession === "gunner" &&
            c.combatAssignment === "targeting" &&
            state.ship.modules.some(
                (module) =>
                    module.id === c.moduleId &&
                    module.type === "weaponbay" &&
                    isModuleActive(module),
            ),
    );

    let modifier = 0;

    // Gunner in THIS bay (or global targeting assignment counts as having a gunner)
    if (!gunnerInBay && !hasGlobalTargeting) {
        modifier += COMBAT_ACCURACY_MODIFIERS.NO_GUNNER_PENALTY;
    } else if (gunnerInBay) {
        const gunnerLevel = gunnerInBay.level || 1;
        modifier += Math.min(
            COMBAT_ACCURACY_MODIFIERS.GUNNER_LEVEL_MAX_BONUS,
            gunnerLevel * COMBAT_ACCURACY_MODIFIERS.GUNNER_LEVEL_BONUS,
        );
        // Augmentation bonus on this gunner
        modifier += getAugmentationBonus(gunnerInBay, "accuracyBonus");
        // Trait bonuses/penalties on this gunner
        gunnerInBay.traits?.forEach((trait) => {
            if (trait.effect?.accuracyPenalty) modifier -= Number(trait.effect.accuracyPenalty);
            if (trait.effect?.accuracyBonus) modifier += Number(trait.effect.accuracyBonus);
        });
        modifier += getTechPerkValue(gunnerInBay, "A"); // Ветка "Снайпер"
    }

    // Engineer with calibration in THIS bay
    const engineerWithCalibration = crewInBay.find(
        (c) => c.profession === "engineer" && c.combatAssignment === "calibration",
    );
    if (engineerWithCalibration)
        modifier +=
            COMBAT_ACCURACY_MODIFIERS.CALIBRATION_BONUS +
            (engineerWithCalibration.level ?? 1) * 0.01;

    modifier += computeGlobalAccuracyBonuses(state);

    return modifier;
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
    projectiles: CombatProjectileResolution[],
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
            recordProjectileMiss(projectiles, "laser");
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
        recordProjectileHit(projectiles, "laser", actualShieldDmg, overflow);
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
    projectiles: CombatProjectileResolution[],
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
            recordProjectileMiss(projectiles, "kinetic");
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
        recordProjectileHit(projectiles, "kinetic", shieldDmg, overflow);
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
type InterceptableDamageResult = {
    totalShieldDamage: number;
    totalModuleDamage: number;
    remainingShields: number;
    logs: string[];
    missedShots: number;
    interceptedCount: number;
};

function processInterceptableProjectileDamage(
    weapon: "missile" | "siege_torpedo",
    label: string,
    weaponCount: number,
    finalDamagePerWeapon: number,
    damageMultiplier: number,
    remainingShields: number,
    enemyShields: number,
    accuracy: number,
    interceptChance: number,
    interceptorModuleId: number | undefined,
    projectiles: CombatProjectileResolution[],
): InterceptableDamageResult {
    let totalShieldDamage = 0;
    let totalModuleDamage = 0;
    const logs: string[] = [];
    let missedShots = 0;
    let interceptedCount = 0;

    const actualInterceptChance = Math.max(0, Math.min(1, interceptChance));

    for (let i = 0; i < weaponCount; i++) {
        if (Math.random() > accuracy) {
            missedShots++;
            recordProjectileMiss(projectiles, weapon);
            continue;
        }

        if (Math.random() < actualInterceptChance) {
            interceptedCount++;
            recordProjectileInterception(projectiles, weapon, interceptorModuleId);
            continue;
        }

        const missileDmg = finalDamagePerWeapon * damageMultiplier;
        const shieldDmg = Math.min(remainingShields, missileDmg);
        const overflow = missileDmg - shieldDmg;

        remainingShields -= shieldDmg;
        totalShieldDamage += shieldDmg;
        totalModuleDamage += overflow;

        if (enemyShields > 0 && shieldDmg > 0) {
            logs.push(`${label}: -${shieldDmg} щитам`);
        }
        recordProjectileHit(projectiles, weapon, shieldDmg, overflow);
    }

    if (interceptedCount > 0) {
        logs.push(`🛡️ ${interceptedCount} ${label.toLowerCase()} сбита(ы)!`);
    }

    return {
        totalShieldDamage,
        totalModuleDamage,
        remainingShields,
        logs,
        missedShots,
        interceptedCount,
    };
}

export function processMissileDamage(
    weaponCount: number,
    finalDamagePerWeapon: number,
    damageMultiplier: number,
    remainingShields: number,
    enemyShields: number,
    accuracy: number,
    interceptChance: number,
    interceptorModuleId: number | undefined,
    projectiles: CombatProjectileResolution[],
): InterceptableDamageResult & { missileInterceptedCount: number } {
    const result = processInterceptableProjectileDamage(
        "missile",
        "Ракета",
        weaponCount,
        finalDamagePerWeapon,
        damageMultiplier,
        remainingShields,
        enemyShields,
        accuracy,
        interceptChance,
        interceptorModuleId,
        projectiles,
    );

    return { ...result, missileInterceptedCount: result.interceptedCount };
}

export function processSiegeTorpedoDamage(
    weaponCount: number,
    finalDamagePerWeapon: number,
    damageMultiplier: number,
    remainingShields: number,
    enemyShields: number,
    accuracy: number,
    interceptChance: number,
    interceptorModuleId: number | undefined,
    projectiles: CombatProjectileResolution[],
): InterceptableDamageResult {
    return processInterceptableProjectileDamage(
        "siege_torpedo",
        "Осадная торпеда",
        weaponCount,
        finalDamagePerWeapon,
        damageMultiplier,
        remainingShields,
        enemyShields,
        accuracy,
        interceptChance,
        interceptorModuleId,
        projectiles,
    );
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
    projectiles: CombatProjectileResolution[],
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
            recordProjectileMiss(projectiles, "plasma");
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
        recordProjectileHit(projectiles, "plasma", actualShieldDmg, overflow);
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
 * Fires once per weapon. Each hit grants +10% damage stack (max 10 stacks = +100%).
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
    projectiles: CombatProjectileResolution[],
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

    const stackBonus = 1 + droneStacks * DRONE_STACK_BONUS;

    if (droneStacks > 0) {
        logs.push(
            `🤖 Дроны разогнаны: x${stackBonus.toFixed(2)} урон (${droneStacks} стак.)`,
        );
    }

    for (let i = 0; i < weaponCount; i++) {
        if (Math.random() > accuracy) {
            missedShots++;
            recordProjectileMiss(projectiles, "drones");
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
        recordProjectileHit(projectiles, "drones", shieldDmg, overflow);
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
    projectiles: CombatProjectileResolution[],
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
            recordProjectileMiss(projectiles, "antimatter");
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
        recordProjectileHit(projectiles, "antimatter", actualShieldDmg, overflow);
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
    interceptChance: number,
    interceptorModuleId: number | undefined,
    projectiles: CombatProjectileResolution[],
): {
    totalModuleDamage: number;
    logs: string[];
    missedShots: number;
    interceptedCount: number;
} {
    let totalModuleDamage = 0;
    const logs: string[] = [];
    let missedShots = 0;
    let interceptedCount = 0;

    for (let i = 0; i < weaponCount; i++) {
        if (Math.random() > accuracy) {
            missedShots++;
            recordProjectileMiss(projectiles, "quantum_torpedo");
            continue;
        }

        if (Math.random() < Math.max(0, Math.min(1, interceptChance))) {
            interceptedCount++;
            recordProjectileInterception(
                projectiles,
                "quantum_torpedo",
                interceptorModuleId,
            );
            continue;
        }

        const torpedoDmg = finalDamagePerWeapon * damageMultiplier;
        totalModuleDamage += torpedoDmg;
        logs.push(`Квант. торпеда: ${torpedoDmg} прямо по модулям!`);
        recordProjectileHit(projectiles, "quantum_torpedo", 0, torpedoDmg);
    }

    if (interceptedCount > 0) {
        logs.push(`🛡️ ${interceptedCount} квант. торпеда(ы) сбита(ы)!`);
    }

    return {
        totalModuleDamage,
        logs,
        missedShots,
        interceptedCount,
    };
}

/**
 * Processes ion cannon damage (massive shield damage, 1 hull damage when shields are down)
 */
export function processIonCannonDamage(
    weaponCount: number,
    finalDamagePerWeapon: number,
    damageMultiplier: number,
    remainingShields: number,
    accuracy: number,
    shieldBonus: number,
    projectiles: CombatProjectileResolution[],
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
            recordProjectileMiss(projectiles, "ion_cannon");
            continue;
        }

        const ionDmg = finalDamagePerWeapon * damageMultiplier;
        const shieldDmg = Math.floor(ionDmg * shieldBonus);
        const shieldsBeforeShot = remainingShields;
        const actualShieldDmg = Math.min(remainingShields, shieldDmg);

        remainingShields -= actualShieldDmg;
        totalShieldDamage += actualShieldDmg;

        let hullDamage = 0;
        if (shieldsBeforeShot > 0) {
            logs.push(`⚡ Ионная пушка: -${actualShieldDmg} щитам`);
        } else {
            // Ионизация наносит минимальный урон корпусу даже без щитов
            hullDamage = 1;
            totalModuleDamage += hullDamage;
            logs.push(`⚡ Ионная пушка: щиты сняты, ионизация -1 корпусу`);
        }
        recordProjectileHit(projectiles, "ion_cannon", actualShieldDmg, hullDamage);
    }

    return {
        totalShieldDamage,
        totalModuleDamage,
        remainingShields,
        logs,
        missedShots,
    };
}
