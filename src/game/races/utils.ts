import { PROFESSION_NAMES } from "@/game/constants/crew";
import { RACE_LAST_NAMES, RACES } from "@/game/constants/races";
import type { Profession, Race, RaceId } from "@/game/types";

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

// Generate race-appropriate name
export const getRandomRaceName = (
    raceId: RaceId,
    profession: Profession,
    seed?: number,
): string => {
    const profName = PROFESSION_NAMES[profession];
    const raceNames = RACE_LAST_NAMES[raceId];

    let index: number;
    if (seed !== undefined) {
        // Deterministic selection based on seed
        // Combine seed with raceId and profession for more uniqueness
        let combinedSeed = seed;
        for (let i = 0; i < raceId.length; i++) {
            combinedSeed =
                (combinedSeed << 5) - combinedSeed + raceId.charCodeAt(i);
        }
        for (let i = 0; i < profession.length; i++) {
            combinedSeed =
                (combinedSeed << 5) - combinedSeed + profession.charCodeAt(i);
        }
        const hash = Math.abs(Math.sin(combinedSeed) * 10000);
        index = Math.floor(hash % raceNames.length);
    } else {
        // Fallback to random for backward compatibility
        index = Math.floor(Math.random() * raceNames.length);
    }

    const lastName = raceNames[index];

    return `${profName} ${lastName}`;
};
