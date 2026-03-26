import type { RaceId } from "@/game/types";
import type { ExploreTile, ExploreTileType } from "@/game/types/exploration";
import {
    EXPEDITION_GRID_SIZE,
    EXPEDITION_TILE_COUNT,
    EXPEDITION_MAX_ARTIFACTS,
} from "./constants";
import { getWeightsForRace, pickWeightedTile } from "./tileWeights";

function shuffle<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

export function generateExpeditionGrid(
    raceId: RaceId | undefined,
): ExploreTile[] {
    const weights = getWeightsForRace(raceId);
    const types: ExploreTileType[] = [];
    let artifactCount = 0;

    // Fill 24 tiles with weighted random types (tile 24 reserved for exit)
    for (let i = 0; i < EXPEDITION_TILE_COUNT - 1; i++) {
        const exclude: ExploreTileType[] = ["exit"];
        if (artifactCount >= EXPEDITION_MAX_ARTIFACTS) exclude.push("artifact");

        const type = pickWeightedTile(weights, exclude);
        if (type === "artifact") artifactCount++;
        types.push(type);
    }

    // Add exactly one exit tile
    types.push("exit");

    // Shuffle so exit is not always last
    const shuffled = shuffle(types);

    // Build grid
    return shuffled.map((type, i) => ({
        type,
        revealed: false,
        x: i % EXPEDITION_GRID_SIZE,
        y: Math.floor(i / EXPEDITION_GRID_SIZE),
    }));
}
