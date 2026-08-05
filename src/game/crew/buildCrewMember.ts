import {
    generateCrewTraits,
    getRandomName,
    getTraitById,
} from "@/game/crew/generation";
import { getRaceCrewBonus, getRandomRace } from "@/game/races";
import { fillMissingTechPerkTiers } from "@/game/crew/techPerks";
import {
    BASE_CREW_HEALTH,
    BASE_CREW_HEALTH_PER_LEVEL,
    DEFAULT_MAX_HAPPINESS,
    INITIAL_HAPPINESS_PERCENT,
} from "@/game/constants/crew";
import { RACES } from "@/game/constants/races";
import type {
    CrewMember,
    CrewTrait,
    Profession,
    Quality,
    RaceId,
    TechPerkBranch,
    TechPerkTier,
    TraitId,
} from "@/game/types";

export interface CrewBuildOptions {
    /** Фиксированный ID. Если не указан — Date.now(). */
    id?: number;
    /** Имя персонажа. Генерируется из профессии+расы, если не указано. */
    name?: string;
    /** Раса или "random". По умолчанию: "human". */
    race?: RaceId | "random";
    /** Расы, исключённые из случайного выбора. */
    excludeRaces?: RaceId[];
    /** Профессия или "random". По умолчанию: "pilot". */
    profession?: Profession | "random";
    /** Профессии, исключённые из случайного выбора. */
    excludeProfessions?: Profession[];
    /** Фиксированный уровень или [min, max] для случайного диапазона. По умолчанию: 1. */
    level?: number | [number, number];
    /**
     * Трейты персонажа. Три варианта:
     * - `TraitId[]`  — по ID: `["charismatic", "nightmares"]`
     * - `CrewTrait[]` — готовые объекты трейтов
     * - `Quality`    — строка качества для случайной генерации: `"good"`
     * По умолчанию: `[]`
     */
    traits?: TraitId[] | CrewTrait[] | Quality;
    /** Seed для детерминированной случайности (имя, раса, профессия, уровень, трейты). */
    seed?: number;
    /** ID модуля для размещения. По умолчанию: 1. */
    moduleId?: number;
    /** Начальный опыт. По умолчанию: 0. */
    exp?: number;
    /** Уже сделанные выборы веток прокачки (тир → ветка). По умолчанию: не выбраны. */
    techPerks?: Partial<Record<TechPerkTier, TechPerkBranch>>;
}

const ALL_PROFESSIONS: Profession[] = [
    "pilot",
    "engineer",
    "medic",
    "scout",
    "scientist",
    "gunner",
];

const seededRand = (seed: number, offset: number): number =>
    Math.abs(Math.sin(seed + offset) * 10000) % 1;

interface CrewStatsOptions {
    race: RaceId;
    traits: CrewMember["traits"];
    level: number;
}

interface CrewStats {
    maxHealth: number;
    maxHappiness: number;
    hasHappiness: boolean;
}

const calculateCrewStats = (options: CrewStatsOptions): CrewStats => {
    const { race, traits, level } = options;
    const raceData = RACES[race];
    const raceHealthBonus = getRaceCrewBonus(race, "health");
    let raceHealthPenaltyPercent = 0;

    raceData?.specialTraits?.forEach((trait) => {
        if (trait.effects.healthPenalty) {
            raceHealthPenaltyPercent += Math.abs(
                Number(trait.effects.healthPenalty),
            );
        }
    });

    let maxHealth =
        BASE_CREW_HEALTH + BASE_CREW_HEALTH_PER_LEVEL * (level - 1);
    if (raceHealthPenaltyPercent > 0) {
        maxHealth = Math.floor(maxHealth * (1 - raceHealthPenaltyPercent));
    }
    traits.forEach((trait) => {
        if (trait.effect.healthPenalty) {
            maxHealth = Math.floor(
                maxHealth * (1 - trait.effect.healthPenalty),
            );
        }
        if (trait.effect.healthBonus) {
            maxHealth = Math.floor(maxHealth * (1 + trait.effect.healthBonus));
        }
    });
    maxHealth += raceHealthBonus * level;

    const raceHappinessBonus = getRaceCrewBonus(race, "happiness");
    let maxHappiness = DEFAULT_MAX_HAPPINESS + raceHappinessBonus;
    traits.forEach((trait) => {
        if (trait.effect.maxHappinessBonus) {
            maxHappiness = Math.floor(
                maxHappiness * (1 + trait.effect.maxHappinessBonus),
            );
        }
    });

    const hasHappiness = raceData?.hasHappiness ?? true;
    return {
        maxHealth,
        maxHappiness: hasHappiness ? maxHappiness : 0,
        hasHappiness,
    };
};

/**
 * Универсальный конструктор члена экипажа.
 *
 * Примеры использования:
 *
 * // Стартовый персонаж
 * buildCrewMember({ id: 1, name: "Иванов", profession: "pilot", moduleId: 102 })
 *
 * // Случайный выживший
 * buildCrewMember({ race: "random", excludeRaces: ["synthetic"], profession: "random", excludeProfessions: ["gunner"] })
 *
 * // Персонаж станции с трейтами по качеству и seed
 * buildCrewMember({ race: "krylorian", profession: "engineer", level: [1, 3], traits: "good", seed: 42 })
 */
export function buildCrewMember(options: CrewBuildOptions = {}): CrewMember {
    const {
        id,
        name: nameOpt,
        race: raceOpt = "human",
        excludeRaces = [],
        profession: profOpt = "pilot",
        excludeProfessions = [],
        level: levelOpt = 1,
        traits: traitsOpt = [],
        seed,
        moduleId = 1,
        exp = 0,
        techPerks,
    } = options;

    // Profession
    let profession: Profession;
    if (profOpt === "random") {
        const pool = ALL_PROFESSIONS.filter(
            (p) => !excludeProfessions.includes(p),
        );
        const r = seed !== undefined ? seededRand(seed, 10) : Math.random();
        profession = pool[Math.floor(r * pool.length)];
    } else {
        profession = profOpt;
    }

    // Race
    let race: RaceId;
    if (raceOpt === "random") {
        race = getRandomRace(excludeRaces, seed);
    } else {
        race = raceOpt;
    }

    // Level
    let level: number;
    if (Array.isArray(levelOpt)) {
        const [min, max] = levelOpt;
        const r = seed !== undefined ? seededRand(seed, 20) : Math.random();
        level = min + Math.floor(r * (max - min + 1));
        level = Math.max(min, Math.min(max, level));
    } else {
        level = levelOpt;
    }

    // Traits
    let traits: CrewTrait[];
    if (typeof traitsOpt === "string") {
        // Quality string — random generation
        const hasHappiness = RACES[race]?.hasHappiness ?? true;
        traits = generateCrewTraits(traitsOpt, seed ?? 0, hasHappiness).traits;
    } else if (
        Array.isArray(traitsOpt) &&
        (traitsOpt.length === 0 || typeof traitsOpt[0] === "string")
    ) {
        // TraitId[] — lookup by id
        traits = (traitsOpt as TraitId[]).map(getTraitById);
    } else {
        // CrewTrait[] — use as-is
        traits = traitsOpt as CrewTrait[];
    }

    // Tech perks: персонаж 3+ уровня, минующий обычный игровой левелап
    // (стартовый экипаж, найм, спасённый выживший), не должен упираться в
    // модалку выбора "задним числом" — вместо неё случайно закрываются все
    // уже пройденные тиры без явного выбора.
    let tierCall = 0;
    const resolvedTechPerks = fillMissingTechPerkTiers(
        level,
        techPerks,
        seed !== undefined ? () => seededRand(seed, 40 + tierCall++) : undefined,
    );

    // Name
    const name = nameOpt ?? getRandomName(profession, race, seed);

    // Stats (health, happiness)
    const stats = calculateCrewStats({ race, traits, level });

    return {
        id: id ?? Date.now(),
        name,
        race,
        profession,
        level,
        exp,
        health: stats.maxHealth,
        maxHealth: stats.maxHealth,
        happiness: stats.hasHappiness
            ? Math.floor((stats.maxHappiness * INITIAL_HAPPINESS_PERCENT) / 100)
            : 0,
        maxHappiness: stats.maxHappiness,
        assignment: null,
        assignmentEffect: null,
        combatAssignment: null,
        combatAssignmentEffect: null,
        traits,
        moduleId,
        movedThisTurn: false,
        turnsAtZeroHappiness: 0,
        isMerged: false,
        mergedModuleId: null,
        firstaidActive: false,
        augmentation: null,
        ...(resolvedTechPerks ? { techPerks: resolvedTechPerks } : {}),
    };
}
