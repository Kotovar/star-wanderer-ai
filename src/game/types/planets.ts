import type { RaceId } from "./races";
import type { PlanetEffectType } from "./effects";
import type { Goods } from "./goods";
import type { ResearchResourceType } from "./research";

export type PreSpacefaringDevelopment =
    | "primitive"
    | "agrarian"
    | "industrial"
    | "modern";
export type PreSpacefaringContactStep = 0 | 1 | 2 | 3;
export type PreSpacefaringActionStep = 0 | 1 | 2;
export type PreSpacefaringOutcome = "protected" | "assisted" | "partnered";

export interface PreSpacefaringSettlementSite {
    civilizationId: string;
    development: PreSpacefaringDevelopment;
}

export interface PreSpacefaringSettlementCandidate
    extends PreSpacefaringSettlementSite {
    tileIndex: number;
}

export interface PreSpacefaringContact extends PreSpacefaringSettlementSite {
    step: PreSpacefaringContactStep;
    outcome?: PreSpacefaringOutcome;
    actionHistory?: string[];
}

export interface PreSpacefaringAction {
    id: string;
    step: PreSpacefaringActionStep;
    requiredGood?: { id: Goods; quantity: number };
    outcome?: PreSpacefaringOutcome;
    reward: {
        researchResources: {
            type: ResearchResourceType;
            quantity: number;
        }[];
    };
}

export interface PreSpacefaringCivilization
    extends PreSpacefaringSettlementSite {
    id: string;
    actions: readonly PreSpacefaringAction[];
}

export type PlanetType =
    | "Пустынная"
    | "Ледяная"
    | "Лесная"
    | "Вулканическая"
    | "Океаническая"
    | "Кристаллическая"
    | "Радиоактивная"
    | "Тропическая"
    | "Арктическая"
    | "Разрушенная войной"
    | "Планета-кольцо"
    | "Приливная";

export type PlanetPointOfInterest =
    | "ancient_ruins"
    | "research_site"
    | "resource_vein"
    | "crash_site"
    | "alien_biosphere";

export interface PlanetSpecialization {
    id: string;
    name: string;
    description: string;
    icon: string;
    cost: number; // Cost in credits
    duration: number; // Turns required
    // Cooldown in turns (optional)
    effects: {
        type: PlanetEffectType;
        value: number | string;
        description: string;
    }[];
    cooldown?: number;
    requirements?: {
        minLevel?: number; // Minimum crew level
        maxLevel?: number; // Maximum crew level
        requiredRace?: RaceId; // Only available for specific race
    };
}
