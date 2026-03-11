export const CREW_DAMAGE_RATIO = 0.5; // 50% of module damage goes to crew

/**
 * Calculates crew damage from module damage
 */
export const calculateCrewDamage = (moduleDamage: number) =>
    Math.floor(moduleDamage * CREW_DAMAGE_RATIO);
