import type { BossAbility } from "./bosses";

export interface CombatState {
    enemy: {
        name: string;
        modules: EnemyModule[];
        selectedModule: number | null;
        shields: number;
        maxShields: number;
        // Boss-specific fields
        isBoss?: boolean;
        bossId?: string;
        regenRate?: number; // HP regenerated per turn
        specialAbility?: BossAbility;
        // For bounty contracts
        threat?: number;
    };
    loot: Loot;
    // Ambush - enemy attacks first (when no scanner and approaching unknown enemy ship)
    isAmbush?: boolean;
    ambushAttackDone?: boolean; // Track if ambush attack was already executed
    // Battle results (filled after victory)
    battleResults?: {
        damagedModules: { name: string; damage: number }[];
        destroyedModules: string[];
        woundedCrew: { name: string; damage: number }[];
        deadCrew: string[];
        creditsWon: number;
        artifactFound?: string;
    };
}

export interface EnemyModule {
    id: number;
    type: string;
    name: string;
    health: number;
    maxHealth?: number;
    damage?: number;
    defense?: number;
    // Boss-specific module features
    isAncient?: boolean; // Module not available to player
    regenRate?: number; // Self-regeneration
    specialEffect?: string; // e.g., 'shield_boost', 'damage_aura'
}

export type Loot = {
    credits: number;
    guaranteedArtifact?: string;
    guaranteedModuleDrop?: boolean;
};
