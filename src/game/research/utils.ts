import {
    RESEARCH_TREE,
    type ResearchResourceType,
} from "@/game/constants/research";

/**
 * Get research resources from mining asteroids
 */
export function getMiningResources(
    drillLevel: number,
): { type: ResearchResourceType; quantity: number }[] {
    const resources: { type: ResearchResourceType; quantity: number }[] = [];

    // Small chance for quantum crystals with high level drill
    if (drillLevel >= 3 && Math.random() < 0.05) {
        resources.push({
            type: "quantum_crystals",
            quantity: 1,
        });
    }

    return resources;
}

/**
 * Get research resources from scanning anomalies
 */
export function getAnomalyResources(): {
    type: ResearchResourceType;
    quantity: number;
}[] {
    const resources: { type: ResearchResourceType; quantity: number }[] = [];

    const roll = Math.random();

    if (roll < 0.3) {
        // 30% - Ancient data
        resources.push({
            type: "ancient_data",
            quantity: Math.floor(Math.random() * 3) + 1,
        });
    } else if (roll < 0.5) {
        // 20% - Energy samples
        resources.push({
            type: "energy_samples",
            quantity: Math.floor(Math.random() * 2) + 1,
        });
    } else if (roll < 0.6) {
        // 10% - Quantum crystals (rare!)
        resources.push({
            type: "quantum_crystals",
            quantity: 1,
        });
    }

    return resources;
}

/**
 * Get research resources from defeating enemies
 */
export function getCombatLootResources(
    enemyTier: number,
): { type: ResearchResourceType; quantity: number }[] {
    const resources: { type: ResearchResourceType; quantity: number }[] = [];

    // Always get some tech salvage
    resources.push({
        type: "tech_salvage",
        quantity: Math.floor(Math.random() * 3) + enemyTier,
    });

    // Chance for energy samples from higher tier enemies
    if (enemyTier >= 2 && Math.random() < 0.3) {
        resources.push({
            type: "energy_samples",
            quantity: Math.floor(Math.random() * 2) + 1,
        });
    }

    // Small chance for alien biology from biological enemies
    if (Math.random() < 0.2) {
        resources.push({
            type: "alien_biology",
            quantity: Math.floor(Math.random() * 2) + 1,
        });
    }

    return resources;
}

/**
 * Get research resources from boss defeats
 */
export function getBossLootResources(
    bossTier: number,
): { type: ResearchResourceType; quantity: number }[] {
    const resources: { type: ResearchResourceType; quantity: number }[] = [];

    // Guaranteed tech salvage
    resources.push({
        type: "tech_salvage",
        quantity: 10 + bossTier * 5,
    });

    // Guaranteed energy samples
    resources.push({
        type: "energy_samples",
        quantity: 5 + bossTier,
    });

    // Chance for quantum crystals based on tier
    if (bossTier >= 2) {
        resources.push({
            type: "quantum_crystals",
            quantity: bossTier >= 3 ? 2 : 1,
        });
    }

    // Chance for ancient data
    if (bossTier >= 3) {
        resources.push({
            type: "ancient_data",
            quantity: 10,
        });
    }

    return resources;
}

// Helper function to get adjacent technologies (for discovery)
export const getAdjacentTechs = (techId: string) => {
    const adjacent: string[] = [];
    const tech = RESEARCH_TREE[techId];
    if (!tech) return adjacent;

    // Technologies that have this tech as prerequisite
    Object.values(RESEARCH_TREE).forEach((t) => {
        if (t.prerequisites.includes(techId)) {
            adjacent.push(t.id);
        }
    });

    return adjacent;
};
