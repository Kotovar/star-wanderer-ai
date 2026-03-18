import type {
    EnemyModule,
    EnemyModuleType,
    EnemyShip,
    EnemyStats,
} from "@/game/types";

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

// Enemy type modifiers
const ENEMY_TYPE_MODIFIERS: Record<EnemyShip, EnemyStats> = {
    pirate: {
        healthMod: 0.8, // -20% здоровья (хрупкие)
        damageMod: 1.0, // обычный урон
        shieldMod: 0, // без бонуса к щитам
        weaponCountMod: 1, // +1 оружие
        lootMod: 1.2, // +20% лута (грабят груз)
    },
    raider: {
        healthMod: 0.9, // -10% здоровья
        damageMod: 1.25, // +25% урона
        shieldMod: 0, // без бонуса к щитам
        weaponCountMod: 0, // обычное оружие
        lootMod: 1.0, // обычный лут
    },
    mercenary: {
        healthMod: 1.0, // обычное здоровье
        damageMod: 1.0, // обычный урон
        shieldMod: 1, // +1 к защите щитов
        weaponCountMod: 0, // обычное оружие
        lootMod: 1.0, // обычный лут
    },
    marauder: {
        healthMod: 1.0, // обычное здоровье
        damageMod: 0.9, // -10% урона
        shieldMod: 0, // без бонуса к щитам
        weaponCountMod: 0, // обычное оружие (но с вариацией)
        lootMod: 0.85, // -15% лута (дешёвое оборудование)
    },
};

/**
 * Generates random enemy modules based on threat level and enemy type
 */
export const generateEnemyModules = (
    threat: number,
    enemyType?: EnemyShip,
): EnemyModule[] => {
    const modifiers = enemyType
        ? ENEMY_TYPE_MODIFIERS[enemyType]
        : {
              healthMod: 1.0,
              damageMod: 1.0,
              shieldMod: 0,
              weaponCountMod: 0,
              lootMod: 1.0,
          };

    const modules: EnemyModule[] = [];
    const moduleCount = threat + 2 + modifiers.weaponCountMod;

    // Calculate base stats with modifiers
    const healthMultiplier = modifiers.healthMod;
    const damageMultiplier = modifiers.damageMod;

    // Always add at least one weapon module first
    const baseWeaponHealth = Math.floor(MODULE_HEALTH_BASE * healthMultiplier);
    modules.push({
        id: 0,
        type: "weapon",
        name: "Оружие",
        health: baseWeaponHealth,
        maxHealth: baseWeaponHealth,
        damage: Math.floor(
            threat * MODULE_DAMAGE_PER_THREAT * damageMultiplier,
        ),
        defense: 0,
    });

    // Add remaining modules
    for (let i = 1; i < moduleCount; i++) {
        const type =
            ENEMY_MODULE_TYPES[
                Math.floor(Math.random() * ENEMY_MODULE_TYPES.length)
            ];

        // Marauders have unstable weapons (random damage variation)
        let damageMultiplierWithVar = damageMultiplier;
        if (enemyType === "marauder" && type === "weapon") {
            // ±30% variation for marauder weapons
            damageMultiplierWithVar =
                damageMultiplier * (0.7 + Math.random() * 0.6);
        }

        const defenseValue =
            type === "shield"
                ? Math.min(MODULE_SHIELD_DEFENSE_MAX, Math.ceil(threat / 2)) +
                  modifiers.shieldMod
                : 0;

        const moduleHealth = Math.floor(MODULE_HEALTH_BASE * healthMultiplier);
        modules.push({
            id: i,
            type,
            name: getModuleName(type),
            health: moduleHealth,
            maxHealth: moduleHealth,
            damage:
                type === "weapon"
                    ? Math.floor(
                          threat *
                              MODULE_DAMAGE_PER_THREAT *
                              damageMultiplierWithVar,
                      )
                    : 0,
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
 * Calculates combat loot based on threat level and enemy type
 * Includes random variation: ±20%
 */
export const calculateCombatLoot = (threat: number, enemyType?: EnemyShip) => {
    const modifiers = enemyType
        ? ENEMY_TYPE_MODIFIERS[enemyType]
        : { lootMod: 1.0 };

    const baseLoot = threat * LOOT_BASE_THREAT;
    const variation = LOOT_VARIATION_MIN + Math.random() * LOOT_VARIATION_RANGE;
    return Math.floor(baseLoot * variation * modifiers.lootMod);
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
