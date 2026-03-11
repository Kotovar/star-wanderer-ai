import type { BossAbility } from "./bosses";
import type { ShopItem } from "./shops";
import type { EnemyModule } from "./enemy";

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

export type Loot = {
    credits: number;
    guaranteedArtifact?: string;
    module?: ShopItem; // Full module item for boss rewards (randomly selected from MODULES_FROM_BOSSES)
};
