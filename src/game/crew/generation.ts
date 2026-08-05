import {
    CREW_TRAITS,
    MUTATION_CHANCES,
    RACE_LAST_NAMES,
} from "@/game/constants";
import type {
    CrewTrait,
    Profession,
    Quality,
    RaceId,
    TraitId,
} from "@/game/types";

const conflictingTraits: Partial<Record<TraitId, TraitId[]>> = {
    resilient: ["sickly"],
    invincible: ["sickly"],
    legend: ["sickly"],
    sharpshooter: ["bad_shot"],
    veteran: ["bad_shot"],
    trader: ["greedy"],
    charismatic: ["coward"],
};

const conflictsWithExisting = (
    candidateId: TraitId,
    existing: CrewTrait[],
): boolean => {
    const existingIds = existing.map((trait) => trait.id as TraitId);
    return (
        existingIds.some((id) => conflictingTraits[id]?.includes(candidateId)) ||
        conflictingTraits[candidateId]?.some((id) => existingIds.includes(id)) ||
        false
    );
};

const hasPersonalMoraleEffect = (effect: CrewTrait["effect"]): boolean =>
    effect.moralePenalty !== undefined ||
    effect.combatMoraleDrain !== undefined ||
    effect.combatStartMoraleDrain !== undefined ||
    effect.maxHappinessBonus !== undefined;

export const generateCrewTraits = (
    quality: Quality = "average",
    seed: number = 0,
    hasHappiness: boolean = true,
    profession?: Profession,
    race?: RaceId,
): { traits: CrewTrait[]; priceModifier: number } => {
    const traits: CrewTrait[] = [];
    let priceModifier = 1;

    const positiveChance = {
        poor: 0.3,
        average: 0.5,
        good: 0.7,
        excellent: 0.9,
    }[quality];
    const negativeChance = {
        poor: 0.6,
        average: 0.4,
        good: 0.2,
        excellent: 0.1,
    }[quality];
    const rareChance = { poor: 0.05, average: 0.15, good: 0.3, excellent: 0.5 }[
        quality
    ];
    const legendaryChance = {
        poor: 0,
        average: 0.05,
        good: 0.1,
        excellent: 0.2,
    }[quality];
    const seededRandom = (offset: number) =>
        Math.abs(Math.sin(seed + offset) * 10000) % 1;
    const moraleFilter = (trait: { effect: CrewTrait["effect"] }) =>
        hasHappiness || !hasPersonalMoraleEffect(trait.effect);
    const scopeFilter = (trait: {
        forProfession?: Profession;
        forRace?: RaceId;
    }) =>
        (!trait.forProfession || trait.forProfession === profession) &&
        (!trait.forRace || trait.forRace === race);

    if (seededRandom(100) < positiveChance) {
        const roll = seededRandom(101);
        const rarity =
            roll < legendaryChance
                ? "legendary"
                : roll < rareChance
                  ? "rare"
                  : "common";
        const pool = CREW_TRAITS.positive.filter(
            (trait) =>
                trait.rarity === rarity &&
                moraleFilter(trait) &&
                scopeFilter(trait),
        );
        if (pool.length > 0) {
            const trait = pool[Math.floor(seededRandom(102) * pool.length)];
            traits.push({
                id: trait.id,
                name: trait.name,
                desc: trait.desc,
                effect: trait.effect,
                type: "positive",
            });
            priceModifier *= trait.priceMod;
        }
    }

    if (seededRandom(200) < negativeChance) {
        const roll = seededRandom(201);
        const rarity = roll < 0.2 ? "rare" : "common";
        const pool = CREW_TRAITS.negative
            .filter(
                (trait) =>
                    trait.rarity === rarity &&
                    moraleFilter(trait) &&
                    scopeFilter(trait),
            )
            .filter((trait) => !conflictsWithExisting(trait.id, traits));
        if (pool.length > 0) {
            const trait = pool[Math.floor(seededRandom(202) * pool.length)];
            traits.push({
                id: trait.id,
                name: trait.name,
                desc: trait.desc,
                effect: trait.effect,
                type: "negative",
            });
            priceModifier *= trait.priceMod;
        }
    }

    const mutationChance = MUTATION_CHANCES.HIRE_MUTATION_BY_QUALITY[quality];
    if (seededRandom(300) < mutationChance) {
        const pool = CREW_TRAITS.mutation
            .filter(moraleFilter)
            .filter((trait) => !conflictsWithExisting(trait.id, traits));
        if (pool.length > 0) {
            const trait = pool[Math.floor(seededRandom(301) * pool.length)];
            traits.push({
                id: trait.id,
                name: trait.name,
                desc: trait.desc,
                effect: trait.effect,
                type: "mutation",
            });
            priceModifier *= trait.priceMod;
        }
    }

    return { traits, priceModifier };
};

export const getRandomName = (
    profession: Profession,
    race: RaceId = "human",
    seed?: number,
): string => {
    const raceLastNames = RACE_LAST_NAMES[race];
    if (seed === undefined) {
        return raceLastNames[Math.floor(Math.random() * raceLastNames.length)];
    }

    let combinedSeed = seed;
    for (const value of [race, profession]) {
        for (let index = 0; index < value.length; index++) {
            combinedSeed =
                (combinedSeed << 5) - combinedSeed + value.charCodeAt(index);
        }
    }
    return raceLastNames[
        Math.floor(Math.abs(Math.sin(combinedSeed) * 10000) % raceLastNames.length)
    ];
};

const traitRegistry = new Map<TraitId, CrewTrait>(
    (["positive", "negative", "mutation"] as const).flatMap((type) =>
        CREW_TRAITS[type].map((trait) => [
            trait.id,
            {
                id: trait.id,
                name: trait.name,
                desc: trait.desc,
                effect: trait.effect,
                type,
            },
        ]),
    ),
);

export const getTraitById = (id: TraitId): CrewTrait => {
    const trait = traitRegistry.get(id);
    if (!trait) throw new Error(`Unknown trait id: "${id}"`);
    return trait;
};
