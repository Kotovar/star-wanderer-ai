import { MODULES_FROM_BOSSES } from "@/game/constants/modules";
import type { GameState, ShopItem } from "@/game/types";

interface BossReward {
    artifactId?: string;
    module?: ShopItem;
    credits: number;
}

const STORY_BOSS_REWARD_BY_TIER: Partial<Record<number, string>> = {
    2: "scanner-quantum",
    3: "engine-quantum",
};

const hasRewardModule = (state: GameState, module: ShopItem): boolean =>
    state.ship.modules.some(
        (m) =>
            m.type === module.moduleType &&
            !m.disabled &&
            m.health > 0 &&
            (m.level || 1) >= (module.level || 1),
    ) ||
    state.ship.cargo.some(
        (item) => item.isModule && item.module?.id === module.id,
    );

/**
 * Gets a random tier 4 module from MODULES_FROM_BOSSES
 * Only available for tier 2+ bosses. Excludes modules player already has installed.
 */
const getRandomBossReward = (
    state: GameState,
    bossTier: number,
): ShopItem | null => {
    // Tier 1 bosses don't drop modules
    if (bossTier < 2) return null;

    const storyRewardId = STORY_BOSS_REWARD_BY_TIER[bossTier];
    const storyReward = MODULES_FROM_BOSSES.find(
        (module) => module.id === storyRewardId,
    );
    if (storyReward && !hasRewardModule(state, storyReward)) {
        return storyReward;
    }

    // Filter out modules player already has
    const availableModules = MODULES_FROM_BOSSES.filter((module) => {
        return !hasRewardModule(state, module);
    });

    if (availableModules.length === 0) return null;

    const randomIndex = Math.floor(Math.random() * availableModules.length);
    return availableModules[randomIndex];
};

/**
 * Determines boss rewards based on boss configuration
 *
 * @param bossId - The ID of the defeated boss
 * @param bossTier - The tier of the boss (1, 2, or 3)
 * @param state - Current game state
 * @returns BossReward object with artifact, module, and credits
 */
export const determineBossRewards = (
    bossId: string,
    bossTier: number,
    state: GameState,
): BossReward => {
    const rarity = getBossArtifactRarity(bossTier);

    // Pick a random undiscovered artifact of the chosen rarity
    const pool = state.artifacts.filter(
        (a) => !a.discovered && a.rarity === rarity,
    );
    const artifact =
        pool.length > 0
            ? pool[Math.floor(Math.random() * pool.length)]
            : undefined;

    // Get random tier 4 module (tier 1 bosses don't drop modules)
    const rewardModule = getRandomBossReward(state, bossTier);

    return {
        artifactId: artifact?.id,
        module: rewardModule ?? undefined,
        credits: 0, // Credits are calculated separately
    };
};

/**
 * Gets artifact rarity based on boss tier.
 * Tier 1 → rare
 * Tier 2 → legendary (70%) or cursed (30%)
 * Tier 3 → mythic (70%) or cursed (30%)
 */
const getBossArtifactRarity = (
    bossTier: number,
): "rare" | "legendary" | "mythic" | "cursed" => {
    if (bossTier === 1) return "rare";
    if (bossTier === 2) return Math.random() < 0.3 ? "cursed" : "legendary";
    return Math.random() < 0.3 ? "cursed" : "mythic";
};
