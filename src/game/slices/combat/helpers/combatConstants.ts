// ═══════════════════════════════════════════════════════════════
// ENEMY AI - MODULE TARGETING PRIORITIES
// ═══════════════════════════════════════════════════════════════

/**
 * Priority values for enemy AI targeting
 * Higher = more important target
 */
export const MODULE_TARGET_PRIORITY: Record<string, number> = {
    weaponbay: 100, // Disable weapons first
    cockpit: 90, // Disable navigation
    reactor: 85, // Disable power
    engine: 70, // Disable travel
    shield: 60, // Disable defense
    lifesupport: 50, // Crew suffocation
    fueltank: 45, // Fuel
    medical: 40, // Healing
    cargo: 20, // Low priority
    scanner: 15, // Low priority
    drill: 5, // Lowest priority
};

export const DEFAULT_MODULE_PRIORITY = 30;
