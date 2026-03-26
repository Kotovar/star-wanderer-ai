import type { RaceId } from "@/game/types";
import type { ExploreTileType } from "@/game/types/exploration";

type TileWeightMap = Record<ExploreTileType, number>;

// exit tile is always exactly 1, inserted after weighted generation
const DEFAULT_WEIGHTS: TileWeightMap = {
    market: 5,
    lab: 4,
    ruins: 4,
    incident: 3,
    artifact: 2,
    exit: 0,
};

const RACE_WEIGHTS: Record<RaceId, TileWeightMap> = {
    human: {
        market: 7,
        lab: 3,
        ruins: 4,
        incident: 2,
        artifact: 2,
        exit: 0,
    },
    synthetic: {
        market: 3,
        lab: 7,
        ruins: 3,
        incident: 1,
        artifact: 4,
        exit: 0,
    },
    xenosymbiont: {
        market: 3,
        lab: 7, // alien_biology themed
        ruins: 3,
        incident: 5, // mutagenic hazards
        artifact: 2,
        exit: 0,
    },
    krylorian: {
        market: 4,
        lab: 2,
        ruins: 6,
        incident: 6, // combat drills and dangers
        artifact: 2,
        exit: 0,
    },
    voidborn: {
        market: 2,
        lab: 3,
        ruins: 6,
        incident: 3,
        artifact: 6, // mystic artifacts
        exit: 0,
    },
    crystalline: {
        market: 4,
        lab: 6,
        ruins: 3,
        incident: 2,
        artifact: 4,
        exit: 0,
    },
};

export function getWeightsForRace(raceId: RaceId | undefined): TileWeightMap {
    if (!raceId || !(raceId in RACE_WEIGHTS)) return DEFAULT_WEIGHTS;
    return RACE_WEIGHTS[raceId];
}

export function pickWeightedTile(
    weights: TileWeightMap,
    exclude?: ExploreTileType[],
): ExploreTileType {
    const entries = (Object.entries(weights) as [ExploreTileType, number][])
        .filter(([type, w]) => w > 0 && (!exclude || !exclude.includes(type)));

    const total = entries.reduce((sum, [, w]) => sum + w, 0);
    let roll = Math.random() * total;

    for (const [type, w] of entries) {
        roll -= w;
        if (roll <= 0) return type;
    }

    return entries[0][0];
}
