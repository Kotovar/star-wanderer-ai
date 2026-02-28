import type { RaceId } from "./races";

export type PlanetType =
    | "Пустынная"
    | "Ледяная"
    | "Лесная"
    | "Вулканическая"
    | "Океаническая"
    | "Газовый гигант"
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
    cooldown?: number; // Cooldown in turns (optional)
    requirements?: {
        minLevel?: number; // Minimum crew level
        maxLevel?: number; // Maximum crew level
        requiredModule?: string; // Required ship module
        requiredRace?: RaceId; // Only available for specific race
    };
    effects: {
        type: string;
        value: number | string;
        description: string;
    }[];
}
