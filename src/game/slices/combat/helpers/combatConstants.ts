import type { ModuleType } from "@/game/types/modules";

// ═══════════════════════════════════════════════════════════════
// ENEMY AI - MODULE TARGETING PRIORITIES
// ═══════════════════════════════════════════════════════════════

/**
 * Priority values for enemy AI targeting
 * Higher = more important target
 */
export const MODULE_TARGET_PRIORITY: Record<ModuleType, number> = {
    weaponbay: 100, // Disable weapons first
    cockpit: 90, // Disable navigation
    reactor: 85, // Disable power
    engine: 70, // Disable travel
    shield: 60, // Disable defense
    lifesupport: 50, // Crew suffocation
    fueltank: 45, // Fuel
    medical: 40, // Healing
    pulse_drive: 50,
    habitat_module: 30,
    cargo: 20, // Low priority
    scanner: 15, // Low priority
    deep_survey_array: 10,
    repair_bay: 10,
    drill: 5, // Lowest priority
    lab: 5,
    ai_core: 5,
    quarters: 5,
    bio_research_lab: 5,
    weaponShed: 0,
};

export const DEFAULT_MODULE_PRIORITY = 30;

export const MODULE_HEALTH_PRIORITY = {
    LOW: 30,
    MIDDLE: 50,
    HIGH: 70,
    LOW_BONUS: 30,
    MIDDLE_BONUS: 15,
    HIGH_BONUS: 5,
    LENGTH_BONUS: 10,
    RANDOM_BONUS: 20,
} as const;
