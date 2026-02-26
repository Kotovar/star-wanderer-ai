import { CREW_TRAITS, PROFESSION_NAMES } from "@/game/constants/crew";
import type { CrewTrait, Profession } from "@/game/types";

// Generate crew traits based on quality level
export const generateCrewTraits = (
    quality: "poor" | "average" | "good" | "excellent" = "average",
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

export const getRandomName = (profession: Profession): string => {
    const lastNames = [
        "Смирнов",
        "Иванов",
        "Петров",
        "Сидоров",
        "Козлов",
        "Новиков",
        "Морозов",
        "Волков",
        "Соколов",
        "Попов",
        "Лебедев",
        "Кузнецов",
        "Козлова",
        "Новикова",
        "Морозова",
    ];
    const profName = PROFESSION_NAMES[profession];
    return `${profName} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`;
};
