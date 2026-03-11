import type { Module } from "@/game/types";

export const MIN_DAMAGE_AFTER_ARMOR = 1;

/**
 * Applies damage to shields and returns remaining damage
 */
export const applyShieldDamage = (
    shields: number,
    incomingDamage: number,
): {
    remainingShields: number;
    remainingDamage: number;
    shieldAbsorb: number;
} => {
    const shieldAbsorb = Math.min(shields, incomingDamage);
    const remainingShields = shields - shieldAbsorb;
    const remainingDamage = incomingDamage - shieldAbsorb;
    return { remainingShields, remainingDamage, shieldAbsorb };
};

/**
 * Applies armor reduction to damage
 */
export const applyArmorReduction = (
    incomingDamage: number,
    moduleDefense: number,
    artifactDefense?: number,
) => {
    let damageAfterArmor = Math.max(
        MIN_DAMAGE_AFTER_ARMOR,
        incomingDamage - moduleDefense,
    );

    if (artifactDefense) {
        damageAfterArmor = Math.max(
            MIN_DAMAGE_AFTER_ARMOR,
            damageAfterArmor - artifactDefense,
        );
    }

    return damageAfterArmor;
};

/**
 * Finds a random active player module
 */
export const getRandomActiveModule = (modules: Module[]): Module | null => {
    const activeModules = modules.filter((m) => m.health > 0);
    if (activeModules.length === 0) return null;
    return activeModules[Math.floor(Math.random() * activeModules.length)];
};
