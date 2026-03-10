// ═══════════════════════════════════════════════════════════════
// RACES - Galactic species system
// ═══════════════════════════════════════════════════════════════

import type { CrewTraitType } from "./crew";
import type { PlanetType } from "./planets";
import type { XenosymbiontMergeEffect } from "@/game/constants/races";

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
        health?: number; // Health regen modifier
        repair?: number; // Repair efficiency modifier
        science?: number; // Science/research modifier
        combat?: number; // Combat efficiency modifier
        energy?: number; // Energy consumption modifier (negative = less consumption)
        fuelEfficiency?: number; // Fuel efficiency modifier
        adaptation?: number; // Planet adaptation modifier
    };

    // Special traits
    specialTraits: RaceTrait[];

    // Эффекты сращивания с модулями (только для ксеноморфов-симбионтов)
    mergeEffects?: XenosymbiontMergeEffect[];

    // Race relations (-100 to 100, 0 = neutral)
    relations: Partial<Record<RaceId, number>>;

    // Flags
    hasHappiness: boolean; // Does this race have happiness?
    hasFatigue: boolean; // Does this race get tired?
    canGetSick: boolean; // Can this race get diseases?

    // Visual
    color: string; // Theme color for UI
    icon: string; // Emoji or symbol
    homeworld?: string;
}
