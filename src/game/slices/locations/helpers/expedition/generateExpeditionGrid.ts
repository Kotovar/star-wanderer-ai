import type { PlanetPointOfInterest, RaceId } from "@/game/types";
import type { ExploreTile, ExploreTileType } from "@/game/types/exploration";
import type { PlanetType } from "@/game/types/planets";
import type { PreSpacefaringSettlementCandidate } from "@/game/types/planets";
import {
    EXPEDITION_GRID_SIZE,
    EXPEDITION_TILE_COUNT,
    EXPEDITION_MAX_ARTIFACTS,
} from "./constants";
import { getWeightsForRace, pickWeightedTile } from "./tileWeights";

export function generateExpeditionGrid(
    raceId: RaceId | undefined,
    pointOfInterest?: PlanetPointOfInterest,
    planetType?: PlanetType,
    featureWeights?: Partial<Record<ExploreTileType, number>>,
    settlement?: PreSpacefaringSettlementCandidate,
): ExploreTile[] {
    const weights = getWeightsForRace(
        raceId,
        pointOfInterest,
        planetType,
        featureWeights,
    );
    const types: ExploreTileType[] = [];
    let artifactCount = 0;

    // Fill all 25 tiles with weighted random types (exit tile removed)
    for (let i = 0; i < EXPEDITION_TILE_COUNT; i++) {
        const exclude: ExploreTileType[] = [];
        if (artifactCount >= EXPEDITION_MAX_ARTIFACTS) exclude.push("artifact");

        const type = pickWeightedTile(weights, exclude);
        if (type === "artifact") artifactCount++;
        types.push(type);
    }
    if (settlement) types[settlement.tileIndex] = "settlement";

    // Build grid
    return types.map((type, i) => ({
        type,
        revealed: false,
        settlement:
            type === "settlement" && settlement
                ? {
                      civilizationId: settlement.civilizationId,
                      development: settlement.development,
                      temperament: settlement.temperament,
                  }
                : undefined,
        x: i % EXPEDITION_GRID_SIZE,
        y: Math.floor(i / EXPEDITION_GRID_SIZE),
    }));
}
