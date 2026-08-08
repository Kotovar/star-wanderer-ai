import type { PlanetPointOfInterest, RaceId } from "@/game/types";
import type { ExploreTileType } from "@/game/types/exploration";
import type { PlanetType } from "@/game/types/planets";
import { getExpeditionEnvironment } from "./constants";

/**
 * Незаданный тип просто не встречается: `pickWeightedTile` отбрасывает нули.
 * Благодаря этому у населённых и необитаемых планет разные словари клеток,
 * а не один общий с нулями в половине полей.
 */
type TileWeightMap = Partial<Record<ExploreTileType, number>>;

// Base weights for tile types (exit removed - player can end expedition manually)
const DEFAULT_WEIGHTS: TileWeightMap = {
    market: 5,
    lab: 4,
    ruins: 4,
    incident: 3,
    artifact: 2,
};

const RACE_WEIGHTS: Record<RaceId, TileWeightMap> = {
    human: {
        market: 7,
        lab: 3,
        ruins: 4,
        incident: 2,
        artifact: 2,
    },
    synthetic: {
        market: 3,
        lab: 7,
        ruins: 3,
        incident: 1,
        artifact: 4,
    },
    xenosymbiont: {
        market: 3,
        lab: 7, // alien_biology themed
        ruins: 3,
        incident: 5, // mutagenic hazards
        artifact: 2,
    },
    krylorian: {
        market: 4,
        lab: 2,
        ruins: 6,
        incident: 6, // combat drills and dangers
        artifact: 2,
    },
    voidborn: {
        market: 2,
        lab: 3,
        ruins: 6,
        incident: 3,
        artifact: 6, // mystic artifacts
    },
    crystalline: {
        market: 4,
        lab: 6,
        ruins: 3,
        incident: 2,
        artifact: 4,
    },
};

/**
 * Словарь необитаемых планет. Ни рынка, ни лаборатории: торговать не с кем,
 * а «лаборатория» на планете без жителей всё равно отдавала один и тот же
 * tech_salvage, потому что расы у неё нет. Вместо них — схрон (чей-то
 * оставленный груз), керн (порода под ногами), природная опасность и сигнал.
 */
const POINT_OF_INTEREST_WEIGHTS: Record<
    PlanetPointOfInterest,
    TileWeightMap
> = {
    ancient_ruins: {
        cache: 2,
        core_sample: 2,
        ruins: 8,
        hazard: 3,
        artifact: 4,
        signal: 2,
    },
    research_site: {
        cache: 2,
        core_sample: 7,
        ruins: 3,
        hazard: 2,
        artifact: 3,
        signal: 4,
    },
    resource_vein: {
        cache: 4,
        core_sample: 8,
        ruins: 2,
        hazard: 4,
        artifact: 1,
        signal: 1,
    },
    crash_site: {
        cache: 8,
        core_sample: 2,
        ruins: 3,
        hazard: 4,
        artifact: 2,
        signal: 4,
    },
    alien_biosphere: {
        cache: 2,
        core_sample: 5,
        ruins: 2,
        hazard: 7,
        artifact: 2,
        signal: 2,
    },
};

export function getWeightsForRace(
    raceId: RaceId | undefined,
    pointOfInterest?: PlanetPointOfInterest,
    planetType?: PlanetType,
    featureWeights?: Partial<TileWeightMap>,
): TileWeightMap {
    const base = pointOfInterest
        ? POINT_OF_INTEREST_WEIGHTS[pointOfInterest]
        : !raceId || !(raceId in RACE_WEIGHTS)
          ? DEFAULT_WEIGHTS
          : RACE_WEIGHTS[raceId];
    const artifactWeightBonus =
        getExpeditionEnvironment(planetType)?.artifactWeightBonus ?? 0;

    const weights = { ...base };
    if (artifactWeightBonus > 0) {
        weights.artifact = (weights.artifact ?? 0) + artifactWeightBonus;
    }
    for (const [type, bonus] of Object.entries(featureWeights ?? {}) as [
        ExploreTileType,
        number,
    ][]) {
        // Черта усиливает то, что на планете уже есть, а не подсаживает
        // чужой тип клетки: заброшенное поселение не насыпает руин туда,
        // где их и так не бывает.
        if (weights[type] === undefined) continue;
        weights[type] += bonus;
    }
    return weights;
}

export function pickWeightedTile(
    weights: TileWeightMap,
    exclude?: ExploreTileType[],
): ExploreTileType {
    const entries = (
        Object.entries(weights) as [ExploreTileType, number][]
    ).filter(([type, w]) => w > 0 && (!exclude || !exclude.includes(type)));

    const total = entries.reduce((sum, [, w]) => sum + w, 0);
    let roll = Math.random() * total;

    for (const [type, w] of entries) {
        roll -= w;
        if (roll <= 0) return type;
    }

    return entries[0][0];
}
