import { ANCIENT_BOSSES } from "@/game/constants/bosses";
import type { AncientBoss, GalaxyTier } from "@/game/types";

// Get boss by ID
export const getBossById = (id: string): AncientBoss | undefined => {
    return ANCIENT_BOSSES.find((b) => b.id === id);
};

// Get random boss for tier (used in sector generation)
export const getRandomBossForTier = (tier: GalaxyTier): AncientBoss | null => {
    const eligibleBosses = ANCIENT_BOSSES.filter((b) => b.tier <= tier);
    if (eligibleBosses.length === 0) return null;
    return eligibleBosses[Math.floor(Math.random() * eligibleBosses.length)];
};
