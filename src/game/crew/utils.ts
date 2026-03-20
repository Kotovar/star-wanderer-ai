import { useGameStore } from "@/game/store";
import {
    CREW_TRAITS,
    MUTATION_TRAITS,
    RACE_LAST_NAMES,
} from "@/game/constants";
import type {
    CrewMember,
    CrewMemberAssignment,
    CrewMemberCombatAssignment,
    CrewTrait,
    Profession,
    Quality,
    RaceId,
    TraitId,
} from "@/game/types";

/**
 * Конвертирует случайное число [0, 1) в Quality.
 * Распределение: 25% poor / 35% average / 25% good / 15% excellent.
 */
export const rollQuality = (rand: number): Quality => {
    if (rand < 0.25) return "poor";
    if (rand < 0.6) return "average";
    if (rand < 0.85) return "good";
    return "excellent";
};

// Пары трейтов, которые не могут быть у одного персонажа одновременно
const CONFLICTING_TRAITS: Partial<Record<TraitId, TraitId[]>> = {
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
    const existingIds = existing.map((t) => t.id as TraitId);
    if (existingIds.some((id) => CONFLICTING_TRAITS[id]?.includes(candidateId)))
        return true;
    if (CONFLICTING_TRAITS[candidateId]?.some((id) => existingIds.includes(id)))
        return true;
    return false;
};

/** Трейты с эффектами на личную мораль персонажа. Нельзя выдавать расам без счастья. */
const hasPersonalMoraleEffect = (effect: CrewTrait["effect"]): boolean =>
    effect.moralePenalty !== undefined ||
    effect.combatMoraleDrain !== undefined ||
    effect.combatStartMoraleDrain !== undefined ||
    effect.maxHappinessBonus !== undefined;

export const generateCrewTraits = (
    quality: Quality = "average",
    seed: number = 0,
    hasHappiness: boolean = true,
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

    const moraleFilter = (t: { effect: CrewTrait["effect"] }) =>
        hasHappiness || !hasPersonalMoraleEffect(t.effect);

    // Add positive trait
    if (seededRandom(100) < positiveChance) {
        const roll = seededRandom(101);
        let pool;
        if (roll < legendaryChance) {
            pool = CREW_TRAITS.positive.filter(
                (t) => t.rarity === "legendary" && moraleFilter(t),
            );
        } else if (roll < rareChance) {
            pool = CREW_TRAITS.positive.filter(
                (t) => t.rarity === "rare" && moraleFilter(t),
            );
        } else {
            pool = CREW_TRAITS.positive.filter(
                (t) => t.rarity === "common" && moraleFilter(t),
            );
        }
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

    // Add negative trait
    if (seededRandom(200) < negativeChance) {
        const roll = seededRandom(201);
        let pool;
        if (roll < 0.2) {
            pool = CREW_TRAITS.negative.filter(
                (t) => t.rarity === "rare" && moraleFilter(t),
            );
        } else {
            pool = CREW_TRAITS.negative.filter(
                (t) => t.rarity === "common" && moraleFilter(t),
            );
        }
        pool = pool.filter((t) => !conflictsWithExisting(t.id, traits));
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

/**
 * Находит всех членов экипажа указанной профессии.
 *
 * @param crew - Массив экипажа для поиска
 * @param profession - Профессия для поиска
 * @returns Массив членов экипажа с указанной профессией
 */
export const getCrewByProfession = <T extends { profession: Profession }>(
    crew: T[],
    profession: Profession,
): T[] => crew.filter((c) => c.profession === profession);

/** Реестр всех трейтов по ID, построенный из CREW_TRAITS. */
const TRAIT_REGISTRY = new Map<TraitId, CrewTrait>(
    (["positive", "negative", "mutation"] as const).flatMap((type) =>
        CREW_TRAITS[type].map((t) => [
            t.id,
            { id: t.id, name: t.name, desc: t.desc, effect: t.effect, type },
        ]),
    ),
);

/**
 * Возвращает CrewTrait по ID трейта.
 * @example getTraitById("charismatic") // { id: "charismatic", name: "Харизматичный", ... }
 * @example getTraitById("nightmares")  // { id: "nightmares", name: "Мутация: Кошмары", ... }
 */
export const getTraitById = (id: TraitId): CrewTrait => {
    const trait = TRAIT_REGISTRY.get(id);
    if (!trait) throw new Error(`Unknown trait id: "${id}"`);
    return trait;
};

/**
 * Даёт случайную мутацию члену экипажа (если у него ещё нет всех мутаций).
 * Возвращает название мутации или null если добавить некуда.
 */
export const giveRandomMutation = (
    crewMember: CrewMember,
    set: (
        fn: (s: { crew: CrewMember[] }) => Partial<{ crew: CrewMember[] }>,
    ) => void,
): string | null => {
    const existingIds = new Set(crewMember.traits.map((t) => t.id));
    const available = MUTATION_TRAITS.filter((id) => !existingIds.has(id));
    if (available.length === 0) return null;
    const newTraitId = available[Math.floor(Math.random() * available.length)];
    const newTrait = getTraitById(newTraitId);
    set((s) => ({
        crew: s.crew.map((c) =>
            c.id === crewMember.id
                ? { ...c, traits: [...c.traits, newTrait] }
                : c,
        ),
    }));
    return newTrait.name;
};

export const hasCombatAssignment = (
    crew: CrewMember[],
    assignment: CrewMemberCombatAssignment,
) => crew.some((c) => c.combatAssignment === assignment);

export const hasAssignment = (
    crew: CrewMember[],
    assignment: CrewMemberAssignment,
) => crew.some((c) => c.assignment === assignment);

export const hasProfession = (crew: CrewMember[], profession: Profession) =>
    crew.some((c) => c.profession === profession);
