import type { EnemyModule, EnemyModuleType } from "@/game/types";

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

const ENEMY_MODULE_TYPES: EnemyModuleType[] = ["weapon", "shield", "reactor"];

const MODULE_HEALTH_BASE = 100;
const MODULE_DAMAGE_PER_THREAT = 8;
const MODULE_SHIELD_DEFENSE_MAX = 3;

const LOOT_BASE_THREAT = 300;
const LOOT_VARIATION_MIN = 0.8;
const LOOT_VARIATION_RANGE = 0.4; // 0.8 - 1.2 (±20%)

const LOOT_BOSS_BASE = 900;
const LOOT_BOSS_VARIATION_MIN = 0.75;
const LOOT_BOSS_VARIATION_RANGE = 0.5; // 0.75 - 1.25 (±25%)

/**
 * Generates random enemy modules based on threat level
 */
export const generateEnemyModules = (threat: number): EnemyModule[] => {
    const modules: EnemyModule[] = [];
    const moduleCount = threat + 2;

    // Always add at least one weapon module first
    modules.push({
        id: 0,
        type: "weapon",
        name: "Оружие",
        health: MODULE_HEALTH_BASE,
        damage: threat * MODULE_DAMAGE_PER_THREAT,
        defense: 0,
    });

    // Add remaining modules
    for (let i = 1; i < moduleCount; i++) {
        const type =
            ENEMY_MODULE_TYPES[
                Math.floor(Math.random() * ENEMY_MODULE_TYPES.length)
            ];
        const defenseValue =
            type === "shield"
                ? Math.min(MODULE_SHIELD_DEFENSE_MAX, Math.ceil(threat / 2))
                : 0;

        modules.push({
            id: i,
            type,
            name: getModuleName(type),
            health: MODULE_HEALTH_BASE,
            damage: type === "weapon" ? threat * MODULE_DAMAGE_PER_THREAT : 0,
            defense: defenseValue,
        });
    }

    return modules;
};

/**
 * Gets module name by type
 */
const getModuleName = (type: EnemyModuleType) => {
    switch (type) {
        case "weapon":
            return "Оружие";
        case "shield":
            return "Щит";
        case "reactor":
            return "Реактор";
    }
};

/**
 * Calculates combat loot based on threat level
 * Includes random variation: ±20%
 */
export const calculateCombatLoot = (threat: number) => {
    const baseLoot = threat * LOOT_BASE_THREAT;
    const variation = LOOT_VARIATION_MIN + Math.random() * LOOT_VARIATION_RANGE;
    return Math.floor(baseLoot * variation);
};

/**
 * Calculates boss combat loot based on tier
 * Includes random variation: ±25%
 */
export const calculateBossLoot = (tier: number) => {
    const baseLoot = LOOT_BOSS_BASE * tier;
    const variation =
        LOOT_BOSS_VARIATION_MIN + Math.random() * LOOT_BOSS_VARIATION_RANGE;
    return Math.floor(baseLoot * variation);
};
