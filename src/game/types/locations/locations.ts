import type { Contract } from "../contracts";
import type { PlanetType } from "../planets";
import type { RaceId } from "../races";
import type { StationConfig, StationName } from "../stations";
import type { EnemyShip } from "../enemy";
import type { BossType } from "../bosses";
import type { ResearchResourceType } from "../research";

export type AsteroidTier = 1 | 2 | 3 | 4;

export type StormType =
    | "radiation"
    | "ionic"
    | "plasma"
    | "gravitational"
    | "temporal"
    | "nanite";

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
    | "boss"
    | "derelict_ship"
    | "gas_giant"
    | "wreck_field";

export const SHIP_LOCATION_TYPES: LocationType[] = [
    "boss",
    "enemy",
    "friendly_ship",
    "derelict_ship",
];

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
    planetaryDrilled?: boolean; // Planetary drill has been used on this planet
    atmosphereAnalyzed?: boolean; // Atmospheric analysis has been performed
    lastDrillResult?: {
        tradeGood?: { name: string; quantity: number };
        researchResources: { type: ResearchResourceType; quantity: number }[];
    };
    lastAtmosphericResult?: {
        researchResources: { type: ResearchResourceType; quantity: number }[];
    };
    visited?: boolean; // Player has visited this location (opened its panel)
    lastScoutResult?: {
        type: "credits" | "tradeGood" | "nothing" | "enemy";
        value?: number; // For credits
        itemName?: string; // For trade goods
        quantity?: number; // For trade goods quantity
        enemyThreat?: number; // For enemy encounter
        mutationName?: string; // Mutation received during scouting
        researchResources?: { type: ResearchResourceType; quantity: number }[]; // Research resources found
    }; // Result of the last scouting mission
    contracts?: Contract[];
    scoutingAvailable?: boolean;
    scoutedTimes?: number;
    enemyType?: EnemyShip; // Type of enemy ship (pirate, raider, mercenary, marauder)
    threat?: number;
    defeated?: boolean; // Whether this enemy has been defeated
    anomalyType?: "good" | "bad";
    anomalyTier?: number;
    anomalyColor?: string;
    requiresScientistLevel?: number;
    greeting?: string;
    hasTrader?: boolean;
    hasCrew?: boolean;
    hasQuest?: boolean;
    hasDistress?: boolean;
    shipRace?: RaceId; // Race of the friendly ship
    x?: number;
    y?: number;
    distanceRatio?: number; // Distance from center (0-1)
    angle?: number; // Angle position (0-2π) - deterministic based on id
    // Asteroid belt fields
    asteroidTier?: AsteroidTier; // Higher = better resources, needs better drill (4 = ancient, requires ancient drill)
    resources?: { minerals: number; rare: number; credits: number };
    mined?: boolean;
    miningResult?: {
        minerals: number;
        rare: number;
        credits: number;
        researchResources: string[]; // Pre-formatted display strings (icon + name + quantity)
        cargoWarning?: string; // Warning message if cargo was limited
    };
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
    bossType?: BossType; // Type of ancient boss
    bossDefeated?: boolean;
    // Friendly ship pregenerated quest
    pregeneratedQuest?: Contract;
    // Race fields

    population?: number; // Population in thousands

    // Expedition fields
    expeditionCompleted?: boolean; // Surface expedition has been completed (once per planet)

    // Gas giant fields
    gasGiantAtmosphere?: "hydrogen" | "methane" | "ammonia" | "nitrogen";
    gasGiantLastDiveAt?: number; // turn when last dive was completed (for cooldown)

    // Wreck field fields
    wreckTier?: 1 | 2 | 3;           // 1=small debris, 2=battle site, 3=ancient battlefield
    wreckPassesTotal?: number;         // total salvage passes available (2–3)
    wreckPassesDone?: number;          // passes already completed
    wreckExhausted?: boolean;          // all passes done, nothing left
    wreckLastPassLoot?: {              // loot from last pass (for display)
        spares?: number;
        electronics?: number;
        rare_minerals?: number;
        tech_salvage?: number;
        ancient_data?: number;
        shieldDamage?: number;
    };

    // Derelict ship fields
    derelictExplored?: boolean; // Whether this derelict ship has been explored
    derelictLoot?: {
        spares?: number;
        electronics?: number;
        rare_minerals?: number;
        moduleRecipeId?: string; // ID of module recipe found (if any)
    };
}
