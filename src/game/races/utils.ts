import { RACES } from "@/game/constants/races";
import type { PlanetType, Race, RaceId } from "@/game/types";

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

/**
 * Выбирает доминирующую расу для планеты на основе предпочтений расы
 */
export const getDominantRaceForPlanet = (
    planetType: PlanetType,
    excludeIds: RaceId[] = [],
): RaceId => {
    // Calculate weights based on planet type preferences
    const weights: Record<RaceId, number> = {
        human: 0,
        synthetic: 0,
        xenosymbiont: 0,
        krylorian: 0,
        voidborn: 0,
        crystalline: 0,
    };

    (Object.keys(RACES) as RaceId[]).forEach((raceId) => {
        if (excludeIds.includes(raceId)) return;

        const race = RACES[raceId];
        const prefs = race.environmentPreference;

        if (prefs.ideal.includes(planetType)) {
            weights[raceId] = 30; // High weight for ideal planets
        } else if (prefs.acceptable.includes(planetType)) {
            weights[raceId] = 10; // Lower weight for acceptable planets
        }
        // Hostile planets get 0 weight - this race won't dominate
    });

    // Filter available races
    const available = (Object.keys(weights) as RaceId[]).filter(
        (r) => weights[r] > 0,
    );

    // If no race prefers this planet, fall back to random race
    if (available.length === 0) {
        return getRandomRace(excludeIds);
    }

    // Weighted random selection
    const totalWeight = available.reduce((sum, r) => sum + weights[r], 0);
    const random = Math.random() * totalWeight;
    let cumulative = 0;

    for (const raceId of available) {
        cumulative += weights[raceId];
        if (random <= cumulative) return raceId;
    }

    return available[0];
};
