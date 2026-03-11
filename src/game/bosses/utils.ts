import { ANCIENT_BOSSES } from "@/game/constants/bosses";
import type { AncientBoss, GalaxyTierAll } from "@/game/types";
import { bossDistribution } from "@/game/galaxy/bossDistribution";

// Get boss by ID
export const getBossById = (id: string): AncientBoss | undefined => {
    return ANCIENT_BOSSES.find((b) => b.id === id);
};

// Get random boss for tier (used in sector generation)
// This function is deprecated - use bossDistribution.getRandomBossForTier instead
export const getRandomBossForTier = (
    tier: GalaxyTierAll,
): AncientBoss | null => {
    return bossDistribution.getRandomBossForTier(tier);
};
