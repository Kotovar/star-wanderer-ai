import { useGameStore } from "@/game/store";
import { CREW_TRAITS, RACE_LAST_NAMES } from "@/game/constants";
import type { CrewTrait, Profession, Quality, RaceId } from "@/game/types";

// Generate crew traits based on quality level
export const generateCrewTraits = (
    quality: Quality = "average",
    seed: number = 0,
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

    // Seeded random helper
    const seededRandom = (offset: number) => {
        return Math.abs(Math.sin(seed + offset) * 10000) % 1;
    };

    // Add positive trait
    if (seededRandom(100) < positiveChance) {
        const roll = seededRandom(101);
        let pool;
        if (roll < legendaryChance) {
            pool = CREW_TRAITS.positive.filter((t) => t.rarity === "legendary");
        } else if (roll < rareChance) {
            pool = CREW_TRAITS.positive.filter((t) => t.rarity === "rare");
        } else {
            pool = CREW_TRAITS.positive.filter((t) => t.rarity === "common");
        }
        if (pool.length > 0) {
            const trait = pool[Math.floor(seededRandom(102) * pool.length)];
            traits.push({
                name: trait.name,
                desc: trait.desc,
                effect: trait.effect,
                type: "positive",
            });
            priceModifier *= trait.priceMod;
        }
    }

    // Add negative trait
    if (seededRandom(200) < negativeChance) {
        const roll = seededRandom(201);
        let pool;
        if (roll < 0.2) {
            pool = CREW_TRAITS.negative.filter((t) => t.rarity === "rare");
        } else {
            pool = CREW_TRAITS.negative.filter((t) => t.rarity === "common");
        }
        if (pool.length > 0) {
            const trait = pool[Math.floor(seededRandom(202) * pool.length)];
            traits.push({
                name: trait.name,
                desc: trait.desc,
                effect: trait.effect,
                type: "negative" as const,
            });
            priceModifier *= trait.priceMod;
        }
    }

    return { traits, priceModifier };
};

/**
 * Генерирует случайное имя для члена экипажа.
 *
 * @param profession - Профессия члена экипажа
 * @param race - Расовая принадлежность (по умолчанию human)
 * @param seed - Опциональный seed для детерминированной генерации
 * @returns Сгенерированное имя с фамилией
 */
export const getRandomName = (
    profession: Profession,
    race: RaceId = "human",
    seed?: number,
): string => {
    const raceLastNames = RACE_LAST_NAMES[race];

    let index: number;
    if (seed !== undefined) {
        // Детерминированная генерация на основе seed
        let combinedSeed = seed;
        for (let i = 0; i < race.length; i++) {
            combinedSeed =
                (combinedSeed << 5) - combinedSeed + race.charCodeAt(i);
        }
        for (let i = 0; i < profession.length; i++) {
            combinedSeed =
                (combinedSeed << 5) - combinedSeed + profession.charCodeAt(i);
        }
        const hash = Math.abs(Math.sin(combinedSeed) * 10000);
        index = Math.floor(hash % raceLastNames.length);
    } else {
        index = Math.floor(Math.random() * raceLastNames.length);
    }

    return raceLastNames[index];
};

/**
 * Начисляет опыт всему экипажу.
 *
 * Обновляет значение опыта для каждого члена экипажа и опционально
 * добавляет запись в лог игры.
 *
 * @param expAmount - Количество опыта для начисления
 * @param logMessage - Опциональное сообщение для лога
 */
export const giveCrewExperience = (expAmount: number, logMessage?: string) => {
    const state = useGameStore.getState();

    useGameStore.setState((s) => ({
        crew: s.crew.map((c) => ({
            ...c,
            exp: c.exp + expAmount,
        })),
    }));

    if (logMessage) {
        state.addLog(logMessage, "info");
    }
};
