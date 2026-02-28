// ═══════════════════════════════════════════════════════════════
// ANCIENT BOSSES - Relicts of lost civilization
// ═══════════════════════════════════════════════════════════════

import type { ArtifactRarity } from "./artifacts";
import type { GalaxyTier } from "./locations/galaxy";

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
    guaranteedModuleDrop?: "quantum_engine";
}

export interface BossModule {
    type: string;
    name: string;
    isAncient: boolean; // Module not available to player
    description: string;
    specialEffect?: string;
    health: number;
    damage?: number;
    defense?: number;
}

export interface BossAbility {
    name: string;
    description: string;
    trigger: "every_turn" | "low_health" | "on_damage";
    effect: string;
    value?: number;
}
