import type { GalaxyTier } from "./galaxy";
import type { Location } from "./locations";

/**
 * Типы звёзд в галактике
 *
 * Классификация включает основные типы звёзд по спектральным классам:
 * - Красные карлики (M класс) - самые распространённые, холодные
 * - Жёлтые карлики (G класс) - звёзды главной последовательности
 * - Белые карлики - вырожденные звёзды, конечная стадия эволюции
 * - Голубые гиганты (O/B класс) - массивные, горячие, редкие
 * - Красные сверхгиганты - эволюционировавшие массивные звёзды
 * - Нейтронные звёзды - сверхплотные остатки сверхновых
 * - Чёрные дыры - гравитационные сингулярности
 */
export type StarType =
    | "red_dwarf" // Красный карлик (M класс)
    | "yellow_dwarf" // Жёлтый карлик (G класс)
    | "white_dwarf" // Белый карлик (вырожденная звезда)
    | "blue_giant" // Голубой гигант (O/B класс)
    | "red_supergiant" // Красный сверхгигант
    | "neutron_star" // Нейтронная звезда (пульсар)
    | "double" // Двойная звёздная система
    | "triple" // Тройная звёздная система
    | "blackhole"; // Чёрная дыра

export type StarName =
    | "Красный карлик"
    | "Жёлтый карлик"
    | "Белый карлик"
    | "Голубой гигант"
    | "Красный сверхгигант"
    | "Нейтронная звезда"
    | "Двойная звезда"
    | "Тройная звезда"
    | "Чёрная дыра";

export interface Sector {
    id: number;
    name: string;
    danger: number;
    distance: number;
    tier: GalaxyTier; // System tier (1=center, 2=middle, 3=outer)
    locations: Location[];
    star: {
        type: StarType;
        name: StarName;
    };
    mapX?: number;
    mapY?: number;
    mapAngle?: number; // Position on galaxy map (radians)
    mapRadius?: number; // Distance from center on galaxy map
    visited?: boolean; // Has player visited this sector
}

export interface TravelingState {
    destination: Sector;
    turnsLeft: number;
    turnsTotal: number;
}
