import type { CrewTraitType } from "./crew";
import type { ModuleType } from "./modules";
import type { PlanetType } from "./planets";

export type RaceId =
    | "human"
    | "synthetic"
    | "xenosymbiont"
    | "krylorian"
    | "voidborn"
    | "crystalline";

/**
 * ID специальных трейтов рас
 */
export type RaceTraitId =
    | "quick_learner"
    | "no_happiness"
    | "ai_glitch"
    | "symbiosis"
    | "disturbing_presence"
    | "intimidation"
    | "void_shield"
    | "unnerving"
    | "low_health"
    | "crystal_armor"
    | "resonance"
    | "brittle_crystal";

type RaceTraitEffects = {
    expBonus?: number;
    noHappiness?: number;
    glitchChance?: number;
    canMerge?: number;
    alienPresencePenalty?: number;
    evasionBonus?: number;
    shieldRegen?: number;
    healthPenalty?: number;
    moduleDefense?: number;
    artifactBonus?: number;
};

export interface RaceTrait {
    id: RaceTraitId;
    name: string;
    description: string;
    type: CrewTraitType;
    effects: RaceTraitEffects;
}

export interface Race {
    id: RaceId;
    name: string;
    pluralName: string;
    adjective: string; // Adjective form for ship names (e.g., "Человеческий", "Крилорианский")
    description: string;

    // Environment preferences (affects happiness on different planets)
    environmentPreference: {
        ideal: PlanetType[]; // Ideal planet types
        acceptable: PlanetType[]; // Acceptable planet types
        hostile: PlanetType[]; // Hostile planet types (happiness penalty)
    };

    // Crew bonuses
    crewBonuses: {
        happiness?: number; // Base happiness modifier
        health?: number; // Flat bonus to maxHealth at creation
        healthRegen?: number; // Flat HP regen per turn (passive)
        heal?: number; // Heal efficiency modifier (multiplier, e.g. 0.25 = +25%)
        repair?: number; // Repair efficiency modifier
        science?: number; // Science/research modifier (multiplier, e.g. 0.25 = +25%)
        combat?: number; // Combat efficiency modifier
        energy?: number; // Energy consumption modifier (negative = less consumption)
        fuelEfficiency?: number; // Fuel efficiency modifier
        adaptation?: number; // Planet adaptation modifier
    };

    // Special traits
    specialTraits: RaceTrait[];

    // Race relations (-100 to 100, 0 = neutral)
    relations: Partial<Record<RaceId, number>>;

    // Flags
    hasHappiness: boolean; // Does this race have happiness?
    hasFatigue: boolean; // Does this race get tired?
    canGetSick: boolean; // Can this race get diseases?
    requiresOxygen: boolean; // Does this race need oxygen to survive?

    // Visual
    color: string; // Theme color for UI
    icon: string; // Emoji or symbol
    homeworld?: string;
}

export interface XenosymbiontMergeEffect {
    /** ID модуля, с которым произошло сращивание */
    moduleId: number;
    /** Тип модуля */
    moduleType: ModuleType;
    /** Бонус к регенерации щитов (%) */
    shieldRegenBonus?: number;
    /** Бонус к ёмкости щита (%) */
    shieldCapacity?: number;
    /** Бонус к ремонту модулей (%) */
    repairBonus?: number;
    /** Снижение потребления энергии (%) */
    energyReduction?: number;
    /** Бонус к выработке энергии (%) */
    powerOutput?: number;
    /** Бонус к уклонению корабля (%) */
    evasionBonus?: number;
    /** Бонус к инициативе (%) */
    initiativeBonus?: number;
    /** Эффективность кислорода (%) */
    oxygenEfficiency?: number;
    /** Регенерация здоровья экипажа */
    crewHealthRegen?: number;
    /** Вместимость груза (%) */
    cargoCapacity?: number;
    /** Эффективность топлива (%) */
    fuelEfficiency?: number;
    /** Вместимость топлива (%) */
    fuelCapacity?: number;
    /** Дальность сканирования (%) */
    scanRange?: number;
    /** Скорость исследований (%) */
    researchSpeed?: number;
    /** Урон оружия (%) */
    weaponDamage?: number;
    /** Точность оружия (%) */
    weaponAccuracy?: number;
    /** Скорость лечения (%) */
    healing?: number;
    /** Скорость добычи (%) */
    miningSpeed?: number;
    /** Выход ресурсов (%) */
    resourceYield?: number;
    /** Сопротивление сбоям ИИ (%) */
    glitchResistance?: number;
}
