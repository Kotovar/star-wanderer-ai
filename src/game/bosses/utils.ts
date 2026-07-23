import { ANCIENT_BOSSES } from "@/game/constants/bosses";
import type { AncientBoss, EnemyModule, GalaxyTierAll } from "@/game/types";
import { bossDistribution } from "@/game/galaxy/bossDistribution";

// Get boss by ID
export const getBossById = (id: string): AncientBoss | undefined => {
    return ANCIENT_BOSSES.find((b) => b.id === id);
};

export const getBossCombatModules = (boss: AncientBoss): EnemyModule[] => {
    return boss.modules.map((module, id) => ({
        id,
        type: module.type,
        name: module.name,
        health: module.health,
        maxHealth: module.health,
        damage: module.damage ?? 0,
        defense: module.defense ?? 0,
        isAncient: module.isAncient,
        specialEffect: module.specialEffect,
        shieldContribution: module.shieldContribution,
        regenContribution: module.regenContribution,
    }));
};

// Get random boss for tier (used in sector generation)
// This function is deprecated - use bossDistribution.getRandomBossForTier instead
export const getRandomBossForTier = (
    tier: GalaxyTierAll,
): AncientBoss | null => {
    return bossDistribution.getRandomBossForTier(tier);
};
