import type { BossModuleEffect } from "./bosses";

export type EnemyModule = {
    id: number;
    type: string;
    name: string;
    health: number;
    damage?: number;
    defense?: number;
    baseDefense?: number; // Original defense, set on first plasma hit (for armor reduction calculation)
    // Shield module: contribution to enemy shield pool
    shieldContribution?: number; // Max shields this module adds
    regenContribution?: number;  // Shield regen per turn this module adds
    // Boss-specific module features
    maxHealth?: number;
    isAncient?: boolean; // Module not available to player
    regenRate?: number; // Self-regeneration
    specialEffect?: BossModuleEffect; // e.g., { type: 'damage_aura', value: 10 }
};

export type EnemyModuleType = "weapon" | "shield" | "reactor";
export type EnemyShip = "pirate" | "raider" | "mercenary" | "marauder";
export type EnemyStats = {
    healthMod: number;
    damageMod: number;
    shieldMod: number;
    weaponCountMod: number;
    lootMod: number;
};
