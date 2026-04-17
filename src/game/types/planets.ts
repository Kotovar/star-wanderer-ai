import type { RaceId } from "./races";
import type { PlanetEffectType } from "./effects";

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
