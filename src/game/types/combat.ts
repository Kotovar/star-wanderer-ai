import type { BossAbility } from "./bosses";
import type { ShopItem } from "./shops";
import type { EnemyModule } from "./enemy";
import type { RaceId } from "./races";

export interface CombatState {
    enemy: {
        name: string;
        modules: EnemyModule[];
        selectedModule: number | null;
        shields: number;
        maxShields: number;
        shieldRegenRate?: number; // Shields regenerated per turn (driven by alive shield modules)
        // Boss-specific fields
        isBoss?: boolean;
        bossId?: string;
        regenRate?: number; // HP regenerated per turn
        specialAbility?: BossAbility;
        bossAttackCount?: number; // Incremented each boss attack (for guaranteed_crit)
        // For bounty contracts
        threat?: number;
    };
    loot: Loot;
    // Drone stack counter: +5% damage per hit, resets after combat (max 20 stacks = +100%)
    droneStacks: number;
    // Ambush - enemy attacks first (when no scanner and approaching unknown enemy ship)
    isAmbush?: boolean;
    ambushAttackDone?: boolean; // Track if ambush attack was already executed
    skipPlayerTurn?: boolean;        // Boss turn_skip effect: player loses next turn
    bossResurrected?: boolean;       // Track if resurrect_chance was already used
    bossOneShotAbilityFired?: boolean; // Track if one-shot low_health ability (shield_restore, emergency_repair) has fired
    // Set when player's attack brings enemy shields to 0 this turn (suppresses regen on counter-attack)
    enemyShieldsJustBroken?: boolean;
    // Set when combat is triggered by entering a hostile race's location
    defenderRace?: RaceId;
    // Set when player actively attacks a friendly ship (location will be removed on victory)
    combatTargetLocationId?: string;
    // Last hit tracking for UI animations
    lastEnemyHit?: {
        moduleId: number;
        moduleName: string;
        shieldDamage: number;
        hullDamage: number;
    } | null;
    lastPlayerHit?: {
        moduleId: number;
        moduleName: string;
        shieldDamage: number;
        hullDamage: number;
    } | null;
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
