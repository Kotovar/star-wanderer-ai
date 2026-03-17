import { RESEARCH_TREE } from "@/game/constants/research";
import type {
    ResearchBonusType,
    ResearchData,
    TechnologyId,
    ResearchResourceType,
} from "@/game/types";

/**
 * Get research resources from mining asteroids
 */
export function getMiningResources(
    drillLevel: number,
): { type: ResearchResourceType; quantity: number }[] {
    const resources: { type: ResearchResourceType; quantity: number }[] = [];

    // Quantum crystals: 15% base chance at drill level 1, +5% per additional level
    // T1: 15%, T2: 20%, T3: 25%, T4: 30%
    const quantumCrystalChance = 0.15 + (drillLevel - 1) * 0.05;
    if (Math.random() < quantumCrystalChance) {
        resources.push({
            type: "quantum_crystals",
            quantity: drillLevel >= 3 ? Math.floor(Math.random() * 2) + 1 : 1,
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

    if (roll < 0.45) {
        // 45% - Ancient data (increased from 30%, qty 2-4 instead of 1-3)
        resources.push({
            type: "ancient_data",
            quantity: Math.floor(Math.random() * 3) + 2,
        });
    } else if (roll < 0.65) {
        // 20% - Energy samples
        resources.push({
            type: "energy_samples",
            quantity: Math.floor(Math.random() * 2) + 1,
        });
    } else if (roll < 0.80) {
        // 15% - Quantum crystals (increased from 10%)
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

    // Quantum crystals based on tier (T2: 2, T3+: 3)
    if (bossTier >= 2) {
        resources.push({
            type: "quantum_crystals",
            quantity: bossTier >= 3 ? 3 : 2,
        });
    }

    // Ancient data from bosses (T2+: 5, T3+: 15)
    if (bossTier >= 2) {
        resources.push({
            type: "ancient_data",
            quantity: bossTier >= 3 ? 15 : 5,
        });
    }

    return resources;
}

// Helper function to get adjacent technologies (for discovery)
export const getAdjacentTechs = (techId: TechnologyId) => {
    const adjacent: TechnologyId[] = [];
    const tech = RESEARCH_TREE[techId];
    if (!tech) return adjacent;

    // Technologies that have this tech as prerequisite
    Object.values(RESEARCH_TREE).forEach((t) => {
        if (t.prerequisites.includes(techId)) {
            adjacent.push(t.id as TechnologyId);
        }
    });

    return adjacent;
};

/**
 * Вычисляет суммарный бонус от исследованных технологий
 *
 * @param research - Данные об исследованиях
 * @param bonusType - Тип бонуса для поиска (например, "scan_range")
 * @returns Суммарное значение бонуса
 */
export const getTechBonusSum = (
    research: ResearchData,
    bonusType: ResearchBonusType,
): number => {
    let totalBonus = 0;

    research.researchedTechs.forEach((techId) => {
        const tech = RESEARCH_TREE[techId as TechnologyId];
        tech.bonuses.forEach((bonus) => {
            if (bonus.type === bonusType) {
                totalBonus += bonus.value;
            }
        });
    });

    return totalBonus;
};
