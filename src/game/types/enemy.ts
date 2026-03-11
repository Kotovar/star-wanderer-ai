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
    specialEffect?: string; // e.g., 'shield_boost', 'damage_aura'
};

export type EnemyModuleType = "weapon" | "shield" | "reactor";
