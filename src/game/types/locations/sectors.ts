import type { GalaxyTier } from "./galaxy";
import type { Location } from "./locations";

export type StarType = "single" | "double" | "triple" | "blackhole";

export type StarName =
    | "Одиночная звезда"
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
