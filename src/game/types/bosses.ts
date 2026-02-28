// ═══════════════════════════════════════════════════════════════
// ANCIENT BOSSES - Relicts of lost civilization
// ═══════════════════════════════════════════════════════════════

import { ArtifactRarity } from "./artifacts";
import { GalaxyTier } from "./locations/galaxy";

export interface AncientBoss {
    id: string;
    name: string;
    description: string;
    tier: GalaxyTier; // Minimum sector tier to spawn
    modules: BossModule[];
    shields: number;
    regenRate: number; // HP regenerated per turn in combat
    specialAbility: BossAbility;
    guaranteedArtifactRarity: ArtifactRarity;
    guaranteedModuleDrop?: string; // Module type dropped when defeated (e.g., "quantum_engine")
}

export interface BossModule {
    type: string;
    name: string;
    health: number;
    damage?: number;
    defense?: number;
    isAncient: boolean; // Module not available to player
    specialEffect?: string;
    description: string;
}

export interface BossAbility {
    name: string;
    description: string;
    trigger: "every_turn" | "low_health" | "on_damage";
    effect: string;
    value?: number;
}
