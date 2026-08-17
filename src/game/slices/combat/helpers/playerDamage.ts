import type { GameState, WeaponType } from "@/game/types";
import type { CombatProjectileResolution } from "@/game/types/combatCinematics";
import { store as i18nStore } from "@/lib/useTranslation";
import {
    getGunnerAccuracyBonus,
    getGunnerCritBonus,
} from "@/game/crew/combatBonuses";
import {
    BASE_ACCURACY,
    MIN_ACCURACY,
    MAX_ACCURACY,
    WEAPON_TYPES,
    COMBAT_ACCURACY_MODIFIERS,
    COMBAT_DAMAGE_MODIFIERS,
    ARTIFACT_TYPES,
    BASE_CRIT_CHANCE,
    DRONE_MAX_STACKS,
    DRONE_STACK_BONUS,
} from "@/game/constants";
import { isModuleActive } from "@/game/modules/utils";
import { getAugmentationBonus } from "@/game/constants/augmentations";
import {
    findActiveArtifact,
    getArtifactEffectValue,
} from "@/game/artifacts/utils";
import { getMergeEffectsBonus } from "@/game/slices/crew/helpers";
import { getProjectileOutcome } from "./combatTimeline";

export const OVERCLOCK_ARMOR_REDUCTION = 0.1;

export interface ProjectileHullDamageResolution {
    projectiles: CombatProjectileResolution[];
    totalHullDamage: number;
    armorApplied: boolean;
}

const getWeaponName = (weapon: WeaponType): string =>
    i18nStore.t(`weapon_types.${weapon}`);

const addShieldHitLog = (
    logs: string[],
    weapon: WeaponType,
    damage: number,
): void => {
    logs.push(
        i18nStore.t("game_logs.weapon_shield_hit", {
            weapon: getWeaponName(weapon),
            damage,
        }),
    );
};

const addOverflowLog = (logs: string[], damage: number): void => {
    logs.push(i18nStore.t("game_logs.weapon_overflow", { damage }));
};

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
 * Applies the selected target's armor to the projectile groups that actually
 * reached its hull. A weapon that only hit shields cannot lend its penetration
 * to another weapon type in the same bay volley.
 */
export function resolveProjectileHullDamage(
    projectiles: readonly CombatProjectileResolution[],
    targetDefense: number,
    hasOverclock: boolean,
): ProjectileHullDamageResolution {
    const resolved = projectiles.map((projectile) => ({ ...projectile }));
    const groups = new Map<number, number[]>();

    resolved.forEach((projectile, index) => {
        if (projectile.hullDamage <= 0) return;
        const armorPenetration =
            projectile.weapon === "enemy"
                ? 0
                : (WEAPON_TYPES[projectile.weapon].armorPenetration ?? 0);
        const group = groups.get(armorPenetration) ?? [];
        group.push(index);
        groups.set(armorPenetration, group);
    });

    const normalizedDefense = Math.max(0, Math.floor(targetDefense));
    let armorApplied = false;

    for (const [armorPenetration, indexes] of groups) {
        const rawHullDamage = indexes.reduce(
            (total, index) => total + resolved[index].hullDamage,
            0,
        );
        if (rawHullDamage <= 0) continue;

        let effectiveDefense = Math.floor(
            normalizedDefense * (1 - armorPenetration),
        );
        if (hasOverclock) {
            effectiveDefense = Math.floor(
                effectiveDefense * (1 - OVERCLOCK_ARMOR_REDUCTION),
            );
        }
        const finalHullDamage = Math.max(1, rawHullDamage - effectiveDefense);
        armorApplied ||= finalHullDamage < rawHullDamage;

        let remainingRawDamage = rawHullDamage;
        let remainingFinalDamage = finalHullDamage;
        indexes.forEach((index, groupIndex) => {
            const projectile = resolved[index];
            const isLastProjectile = groupIndex === indexes.length - 1;
            const hullDamage = isLastProjectile
                ? remainingFinalDamage
                : Math.floor(
                    (projectile.hullDamage / remainingRawDamage) *
                        remainingFinalDamage,
                );
            remainingRawDamage -= projectile.hullDamage;
            remainingFinalDamage -= hullDamage;
            projectile.hullDamage = hullDamage;
            projectile.outcome =
                hullDamage > 0 || projectile.shieldDamage > 0
                    ? getProjectileOutcome(projectile.shieldDamage, hullDamage)
                    : "blocked";
        });
    }

    return {
        projectiles: resolved,
        totalHullDamage: resolved.reduce(
            (total, projectile) => total + projectile.hullDamage,
            0,
        ),
        armorApplied,
    };
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
    // Живой: смерть не снимает человека с модуля, и труп в оружейном отсеке
    // продолжал давать кораблю крит и снимать штраф "нет стрелка"
    return state.crew.filter(
        (crewMember) =>
            crewMember.profession === "gunner" &&
            crewMember.health > 0 &&
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

/** Призматическая линза работает только у живого члена экипажа в активной палубе с лазером. */
export function getCrewLaserDamageBonus(
    crew: GameState["crew"],
    modules: GameState["ship"]["modules"],
): number {
    const laserWeaponBayIds = new Set(
        modules
            .filter(
                (module) =>
                    module.type === "weaponbay" &&
                    isModuleActive(module) &&
                    module.weapons?.some(
                        (weapon) => weapon?.type === "laser",
                    ),
            )
            .map((module) => module.id),
    );

    return crew.reduce(
        (bonus, crewMember) =>
            crewMember.health > 0 && laserWeaponBayIds.has(crewMember.moduleId)
                ? bonus + getAugmentationBonus(crewMember, "laserDamageBonus")
                : bonus,
        0,
    );
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
 * КАКОМ именно отсеке, и потому считаются в computeBayAccuracyModifier).
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
                c.health > 0 &&
                c.combatAssignment === "targeting" &&
                activeWeaponBayIds.has(c.moduleId),
        )
    )
        modifier += COMBAT_ACCURACY_MODIFIERS.TARGETING_BONUS;
    if (
        state.crew.some(
            (c) =>
                c.profession === "gunner" &&
                c.health > 0 &&
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
 * Per-bay accuracy modifier: gunner/calibration bonuses scoped to specific bay,
 * global bonuses (AI cores, targeting artifact/assignment, rapidfire) apply to all bays.
 */
export function computeBayAccuracyModifier(state: GameState, bayId: number): number {
    const crewInBay = state.crew.filter(
        (c) => c.moduleId === bayId && c.health > 0,
    );
    const gunnerInBay = crewInBay.find((c) => c.profession === "gunner");
    const hasGlobalTargeting = state.crew.some(
        (c) =>
            c.profession === "gunner" &&
            c.health > 0 &&
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
        // Уровень + аугментация + трейты + ветка "Снайпер" — одной функцией,
        // чтобы формула не разъезжалась с подсказкой в модалке выбора ветки
        modifier += getGunnerAccuracyBonus(gunnerInBay);
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
            addShieldHitLog(logs, "laser", actualShieldDmg);
            if (overflow > 0) addOverflowLog(logs, overflow);
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
            addShieldHitLog(logs, "kinetic", shieldDmg);
        }
        recordProjectileHit(projectiles, "kinetic", shieldDmg, overflow);
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
            addShieldHitLog(logs, weapon, shieldDmg);
        }
        recordProjectileHit(projectiles, weapon, shieldDmg, overflow);
    }

    if (interceptedCount > 0) {
        logs.push(
            i18nStore.t("game_logs.weapon_intercepted", {
                count: interceptedCount,
                weapon: getWeaponName(weapon),
            }),
        );
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
): InterceptableDamageResult {
    return processInterceptableProjectileDamage(
        "missile",
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
            addShieldHitLog(logs, "plasma", actualShieldDmg);
            if (overflow > 0) addOverflowLog(logs, Math.floor(overflow));
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

    let currentStacks = Math.min(DRONE_MAX_STACKS, droneStacks);

    if (currentStacks > 0) {
        logs.push(
            i18nStore.t("game_logs.weapon_drones_boosted", {
                multiplier: (1 + currentStacks * DRONE_STACK_BONUS).toFixed(2),
                stacks: currentStacks,
            }),
        );
    }

    for (let i = 0; i < weaponCount; i++) {
        if (Math.random() > accuracy) {
            missedShots++;
            recordProjectileMiss(projectiles, "drones");
            continue;
        }

        droneHitCount++;
        const stackBonus = 1 + currentStacks * DRONE_STACK_BONUS;
        const droneDmg = Math.floor(
            finalDamagePerWeapon * damageMultiplier * stackBonus,
        );
        const shieldDmg = Math.min(remainingShields, droneDmg);
        const overflow = droneDmg - shieldDmg;

        remainingShields -= shieldDmg;
        totalShieldDamage += shieldDmg;
        totalModuleDamage += overflow;

        if (enemyShields > 0 && shieldDmg > 0) {
            addShieldHitLog(logs, "drones", Math.floor(shieldDmg));
        }
        recordProjectileHit(projectiles, "drones", shieldDmg, overflow);
        currentStacks = Math.min(DRONE_MAX_STACKS, currentStacks + 1);
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
            addShieldHitLog(logs, "antimatter", actualShieldDmg);
            if (overflow > 0) addOverflowLog(logs, overflow);
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

        const torpedoDmg = Math.max(
            1,
            Math.floor(finalDamagePerWeapon * damageMultiplier),
        );
        totalModuleDamage += torpedoDmg;
        logs.push(
            i18nStore.t("game_logs.weapon_direct_hull_hit", {
                weapon: getWeaponName("quantum_torpedo"),
                damage: torpedoDmg,
            }),
        );
        recordProjectileHit(projectiles, "quantum_torpedo", 0, torpedoDmg);
    }

    if (interceptedCount > 0) {
        logs.push(
            i18nStore.t("game_logs.weapon_intercepted", {
                count: interceptedCount,
                weapon: getWeaponName("quantum_torpedo"),
            }),
        );
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
            addShieldHitLog(logs, "ion_cannon", actualShieldDmg);
        } else {
            // Ионизация наносит минимальный урон корпусу даже без щитов
            hullDamage = 1;
            totalModuleDamage += hullDamage;
            logs.push(
                i18nStore.t("game_logs.weapon_ion_hull_hit", {
                    weapon: getWeaponName("ion_cannon"),
                    damage: hullDamage,
                }),
            );
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
