import type { BossModuleEffect } from "./bosses";

export type EnemyModule = {
    id: number;
    type: string;
    name: string;
    health: number;
    damage?: number;
    defense?: number;
    // Boss-specific module features
    maxHealth?: number;
    isAncient?: boolean; // Module not available to player
    regenRate?: number; // Self-regeneration
    specialEffect?: BossModuleEffect; // e.g., { type: 'damage_aura', value: 10 }
};

export type EnemyModuleType = "weapon" | "shield" | "reactor";
