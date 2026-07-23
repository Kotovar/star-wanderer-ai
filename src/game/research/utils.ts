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

    // Quantum crystals — основная механическая добыча кристаллов:
    // T1: 40% шанс на 1; T2+: гарантированно, количество растёт с уровнем
    // (T2: 1, T3: 1-2, T4: 2-3)
    if (drillLevel >= 2) {
        const bonus = drillLevel >= 3 ? Math.floor(Math.random() * 2) : 0;
        resources.push({
            type: "quantum_crystals",
            quantity: Math.max(1, drillLevel - 2 + bonus),
        });
    } else if (Math.random() < 0.4) {
        resources.push({ type: "quantum_crystals", quantity: 1 });
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
    } else if (roll < 0.90) {
        // 25% - Quantum crystals (increased from 15%)
        resources.push({
            type: "quantum_crystals",
            quantity: 1,
        });
    }

    return resources;
}

/**
 * Get research resources from scouting planets
 */
export function getScoutingPlanetResources(): {
    type: ResearchResourceType;
    quantity: number;
}[] {
    const resources: { type: ResearchResourceType; quantity: number }[] = [];

    const roll = Math.random();

    if (roll < 0.2) {
        // 20% - Alien biology (primary find on alien planets)
        resources.push({ type: "alien_biology", quantity: 1 });
    } else if (roll < 0.3) {
        // 10% - Ancient data
        resources.push({ type: "ancient_data", quantity: 1 });
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

    // Energy samples: tier 3+ гарантированно (боттлнек науки тира 3),
    // tier 2 — с шансом 30%
    if (enemyTier >= 3) {
        resources.push({
            type: "energy_samples",
            quantity: Math.floor(Math.random() * 2) + 1,
        });
    } else if (enemyTier === 2 && Math.random() < 0.3) {
        resources.push({
            type: "energy_samples",
            quantity: Math.floor(Math.random() * 2) + 1,
        });
    }

    // Alien biology: scales with tier
    const alienBioChance = 0.1 + enemyTier * 0.05; // tier1: 15%, tier2: 20%, tier3: 25%, tier4: 30%
    if (Math.random() < alienBioChance) {
        resources.push({
            type: "alien_biology",
            quantity: Math.floor(Math.random() * 2) + 1,
        });
    }

    // Rare minerals from high-tier enemies
    if (enemyTier >= 3 && Math.random() < 0.25) {
        resources.push({
            type: "rare_minerals",
            quantity: Math.floor(Math.random() * 2) + 1,
        });
    }

    // Quantum crystals from tier 4 enemies
    if (enemyTier >= 4 && Math.random() < 0.15) {
        resources.push({
            type: "quantum_crystals",
            quantity: 1,
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
 * Вычисляет суммарный бонус от исследованных технологий.
 * Единственная точка суммирования тех-бонусов — не дублировать этот reduce по коду.
 *
 * @param research - Данные об исследованиях (достаточно researchedTechs)
 * @param bonusType - Тип бонуса для поиска (например, "scan_range")
 * @param exclude - Технологии, которые не учитывать (например, warp_drive в топливе)
 * @returns Суммарное значение бонуса
 */
export const getTechBonusSum = (
    research: Pick<ResearchData, "researchedTechs">,
    bonusType: ResearchBonusType,
    exclude?: TechnologyId[],
): number => {
    let totalBonus = 0;

    research.researchedTechs.forEach((techId) => {
        if (exclude?.includes(techId)) return;
        const tech = RESEARCH_TREE[techId as TechnologyId];
        if (!tech) return;
        tech.bonuses.forEach((bonus) => {
            if (bonus.type === bonusType) {
                totalBonus += bonus.value;
            }
        });
    });

    return totalBonus;
};
