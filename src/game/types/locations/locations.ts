import type { Contract } from "../contracts";
import type { PlanetType } from "../planets";
import type { RaceId } from "../races";
import type { StationConfig, StationName } from "../stations";

export type AsteroidTier = 1 | 2 | 3 | 4;

export type StormType = "radiation" | "ionic" | "plasma";

export type SignalType = "pirate_ambush" | "survivors" | "abandoned_cargo";

export type SignalDetails = {
    name: string;
    description: string;
    chance: number;
};

export type LocationType =
    | "station"
    | "planet"
    | "enemy"
    | "anomaly"
    | "friendly_ship"
    | "asteroid_belt"
    | "storm"
    | "distress_signal"
    | "boss";

export interface Location {
    id: string;
    type: LocationType;
    name: string;
    dominantRace?: RaceId; // Dominant race on this planet/station
    stationType?: StationName;
    stationConfig?: StationConfig;
    stationId?: string;
    planetType?: PlanetType;
    isEmpty?: boolean;
    explored?: boolean; // Fully explored empty planet (after 3 scout missions)
    visited?: boolean; // Player has visited this location (opened its panel)
    lastScoutResult?: {
        type: "credits" | "tradeGood" | "nothing" | "enemy";
        value?: number; // For credits
        itemName?: string; // For trade goods
        enemyThreat?: number; // For enemy encounter
    }; // Result of the last scouting mission
    contracts?: Contract[];
    scoutingAvailable?: boolean;
    scoutedTimes?: number;
    enemyType?: string;
    threat?: number;
    anomalyType?: "good" | "bad";
    anomalyTier?: number;
    anomalyColor?: string;
    requiresScientistLevel?: number;
    greeting?: string;
    hasTrader?: boolean;
    hasCrew?: boolean;
    hasQuest?: boolean;
    shipRace?: RaceId; // Race of the friendly ship
    x?: number;
    y?: number;
    distanceRatio?: number; // Distance from center (0-1)
    angle?: number; // Angle position (0-2π) - deterministic based on id
    // Asteroid belt fields
    asteroidTier?: AsteroidTier; // Higher = better resources, needs better drill (4 = ancient, requires ancient drill)
    resources?: { minerals: number; rare: number; credits: number };
    mined?: boolean;
    // Storm fields
    stormType?: StormType;
    stormIntensity?: number; // 1-3, affects damage and loot quality
    stormLoot?: { credits: number; moduleDamage: number; shieldBurn: number };
    // Distress signal fields
    signalType?: SignalType;
    signalResolved?: boolean;
    signalRevealed?: boolean; // Scanner successfully revealed the outcome
    signalRevealChecked?: boolean; // Already checked with scanner (one-time check)
    signalLoot?: {
        // Store loot details for display
        credits?: number;
        tradeGood?: { name: string; quantity: number };
        artifact?: string;
    };
    // Ancient boss fields
    bossId?: string;
    bossDefeated?: boolean;
    // Race fields

    population?: number; // Population in thousands
}
