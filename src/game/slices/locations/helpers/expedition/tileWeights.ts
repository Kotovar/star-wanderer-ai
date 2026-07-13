import type { PlanetPointOfInterest, RaceId } from "@/game/types";
import type { ExploreTileType } from "@/game/types/exploration";

type TileWeightMap = Record<ExploreTileType, number>;

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

const POINT_OF_INTEREST_WEIGHTS: Record<
    PlanetPointOfInterest,
    TileWeightMap
> = {
    ancient_ruins: {
        market: 1,
        lab: 3,
        ruins: 8,
        incident: 3,
        artifact: 4,
    },
    research_site: {
        market: 1,
        lab: 8,
        ruins: 3,
        incident: 2,
        artifact: 3,
    },
    resource_vein: {
        market: 6,
        lab: 3,
        ruins: 2,
        incident: 4,
        artifact: 1,
    },
    crash_site: {
        market: 7,
        lab: 2,
        ruins: 3,
        incident: 4,
        artifact: 2,
    },
    alien_biosphere: {
        market: 2,
        lab: 6,
        ruins: 2,
        incident: 6,
        artifact: 2,
    },
};

export function getWeightsForRace(
    raceId: RaceId | undefined,
    pointOfInterest?: PlanetPointOfInterest,
): TileWeightMap {
    if (pointOfInterest) return POINT_OF_INTEREST_WEIGHTS[pointOfInterest];
    if (!raceId || !(raceId in RACE_WEIGHTS)) return DEFAULT_WEIGHTS;
    return RACE_WEIGHTS[raceId];
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
