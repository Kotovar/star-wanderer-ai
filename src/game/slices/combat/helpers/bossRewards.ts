import { MODULES_FROM_BOSSES } from "@/game/constants/modules";
import type { BossModuleType, GameState, ShopItem } from "@/game/types";

interface BossReward {
    artifactId?: string;
    module?: ShopItem;
    credits: number;
}

/**
 * Gets a random tier 4 module from MODULES_FROM_BOSSES
 * Excludes modules player already has installed
 */
export const getRandomBossReward = (state: GameState): ShopItem | null => {
    // Filter out modules player already has
    const availableModules = MODULES_FROM_BOSSES.filter((module) => {
        return !state.ship.modules.some(
            (m) =>
                m.type === module.moduleType &&
                !m.disabled &&
                m.health > 0 &&
                (m.level || 1) >= 4,
        );
    });

    if (availableModules.length === 0) return null;

    // Random selection
    const randomIndex = Math.floor(Math.random() * availableModules.length);
    return availableModules[randomIndex];
};

/**
 * Gets the module configuration from MODULES_FROM_BOSSES by boss module type
 * Only 3 unique boss modules: ancient-core, conversion-core, quantum-engine
 */
export const getBossRewardModule = (
    moduleType: BossModuleType,
): ShopItem | undefined => {
    const moduleIdMap: Record<BossModuleType, string> = {
        ancient_core: "ancient-core",
        conversion_core: "conversion-core",
        quantum_engine: "quantum-engine",
    };

    return MODULES_FROM_BOSSES.find((m) => m.id === moduleIdMap[moduleType]);
};

/**
 * Gets the display name for a boss module reward
 */
export const getBossRewardModuleName = (moduleType: BossModuleType) =>
    getBossRewardModule(moduleType)?.name || "Неизвестный модуль";

/**
 * Gets the ship module type for a boss reward module
 */
export const getBossRewardModuleType = (moduleType: BossModuleType) =>
    getBossRewardModule(moduleType)?.moduleType || "reactor";

/**
 * Determines boss rewards based on boss configuration
 *
 * @param bossId - The ID of the defeated boss
 * @param state - Current game state
 * @returns BossReward object with artifact, module, and credits
 */
export const determineBossRewards = (
    bossId: string,
    state: GameState,
): BossReward => {
    // Find undiscovered artifact of the boss's rarity
    const artifact = state.artifacts.find(
        (a) => !a.discovered && a.rarity === getBossArtifactRarity(bossId),
    );

    // Get random tier 4 module (excludes modules player already has)
    const rewardModule = getRandomBossReward(state);

    return {
        artifactId: artifact?.id,
        module: rewardModule ?? undefined,
        credits: 0, // Credits are calculated separately
    };
};

/**
 * Gets the artifact rarity for a specific boss
 */
const getBossArtifactRarity = (bossId: string) => {
    switch (bossId) {
        case "guardian_sentinel":
            return "rare";
        case "harvester_prime":
            return "legendary";
        case "void_oracle":
            return "mythic";
        case "the_eternal":
            return "cursed";
        default:
            return "rare";
    }
};
