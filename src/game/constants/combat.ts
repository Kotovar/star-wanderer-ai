// ═══════════════════════════════════════════════════════════════
// COMBAT MODIFIERS - Combat assignment and crew bonuses
// ═══════════════════════════════════════════════════════════════

/**
 * Base combat constants
 */
export const BASE_CRIT_CHANCE = 0.05; // 5% base crit chance
export const BASE_CRIT_MULTIPLIER = 1.5; // 1.5x base crit damage

export const BASE_ACCURACY: Record<string, number> = {
    laser: 0.95,
    kinetic: 0.9,
    missile: 0.8,
};

export const MIN_ACCURACY = 0.5; // Minimum 50% accuracy
export const MAX_ACCURACY = 0.95; // Maximum 95% accuracy

/**
 * Damage modifiers for combat assignments
 */
export const COMBAT_DAMAGE_MODIFIERS = {
    // Gunner presence bonus
    GUNNER_BONUS: 1.15, // +15% damage with gunner
    NO_GUNNER_PENALTY: 0.75, // -25% damage without gunner

    // Combat assignments
    OVERCLOCK_BONUS: 1.25, // +25% damage
    RAPIDFIRE_BONUS: 1.25, // +25% damage
    ANALYSIS_BONUS: 1.1, // +10% damage (requires gunner with targeting)
};

/**
 * Accuracy modifiers for combat assignments and features
 */
export const COMBAT_ACCURACY_MODIFIERS = {
    // Base modifiers
    NO_GUNNER_PENALTY: -0.2, // -20% accuracy without gunner

    // Gunner level bonus (per level)
    GUNNER_LEVEL_BONUS: 0.02, // +2% per level
    GUNNER_LEVEL_MAX_BONUS: 0.2, // Cap at +20% (level 10)

    // Combat assignments
    TARGETING_BONUS: 0.05, // +5% accuracy
    RAPIDFIRE_PENALTY: -0.05, // -5% accuracy
    CALIBRATION_BONUS: 0.1, // +10% accuracy (with engineer)

    // Module bonuses
    AI_CORE_BONUS: 0.05, // +5% per AI core module

    // Artifact bonuses
    TARGETING_CORE_BONUS: 0.15, // +15% accuracy

    // Sabotage
    SABOTAGE_PENALTY: -0.05, // -5% enemy accuracy
};

/**
 * Health thresholds for module damage
 */
export const MODULE_HEALTH_THRESHOLDS = {
    CRITICAL: 30,
    DAMAGED: 50,
    SCRATCHED: 70,
};

/**
 * Crew damage modifiers
 */
export const CREW_DAMAGE_MODIFIERS = {
    BASE_RATIO: 0.5, // 50% of module damage goes to crew
    CRITICAL_MULTIPLIER: 1.5, // +50% crew damage in critical modules
};
