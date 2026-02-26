import { ANCIENT_ARTIFACTS } from "@/game/constants/artifacts";
import type { Artifact } from "@/game/types";

// Get artifact by ID
export const getArtifactById = (id: string): Artifact | undefined => {
    return ANCIENT_ARTIFACTS.find((a) => a.id === id);
};

// Get random undiscovered artifact weighted by rarity
export const getRandomUndiscoveredArtifact = (
    artifacts: Artifact[],
): Artifact | null => {
    const undiscovered = artifacts.filter((a) => !a.discovered);
    if (undiscovered.length === 0) return null;

    // Weight by rarity (cursed is moderately rare but not impossible)
    const weights: Record<string, number> = {
        rare: 60,
        legendary: 30,
        mythic: 10,
        cursed: 20,
    };
    const totalWeight = undiscovered.reduce(
        (sum, a) => sum + (weights[a.rarity] || 10),
        0,
    );
    let random = Math.random() * totalWeight;

    for (const artifact of undiscovered) {
        random -= weights[artifact.rarity] || 10;
        if (random <= 0) return artifact;
    }

    return undiscovered[0];
};
