import { RACES } from "@/game/constants/races";
import type { Race, RaceId } from "@/game/types";

// Get race by ID
export const getRaceById = (id: RaceId): Race | undefined => RACES[id];

// Get random race weighted by rarity
export const getRandomRace = (
    excludeIds: RaceId[] = ["human"],
    seed?: number,
): RaceId => {
    const weights: Record<RaceId, number> = {
        human: 40,
        synthetic: 15,
        xenosymbiont: 10,
        krylorian: 20,
        voidborn: 8,
        crystalline: 7,
    };

    const available = (Object.keys(weights) as RaceId[]).filter(
        (r) => !excludeIds.includes(r),
    );
    const totalWeight = available.reduce((sum, r) => sum + weights[r], 0);

    // Use seeded random if seed provided, otherwise use Math.random()
    let random: number;
    if (seed !== undefined) {
        random = (Math.abs(Math.sin(seed) * 10000) % 1) * totalWeight;
    } else {
        random = Math.random() * totalWeight;
    }

    for (const raceId of available) {
        random -= weights[raceId];
        if (random <= 0) return raceId;
    }

    return available[0];
};
