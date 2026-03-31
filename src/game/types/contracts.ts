import type { RaceId } from "./races";
import type { EnemyShip } from "./enemy";
import type { ArtifactRarity } from "./artifacts";

export type ContactSourceType = "planet" | "station" | "ship";

export interface Contract {
    id: string;
    type: ContractType;
    desc: string;
    reward: number;
    cargo?: string;
    quantity?: number; // For supply_run contracts
    targetSector?: number;
    targetSectorName?: string;
    targetLocationId?: string; // Specific location to deliver to (planet, station, ship)
    targetLocationName?: string; // Name of target location
    targetLocationType?: ContactSourceType; // Type of target location
    sourcePlanetId?: string;
    sourcePlanetName?: string;
    sourceSectorName?: string;
    sourceName?: string; // Name of the source (planet or ship)
    sourceType?: Exclude<ContactSourceType, "station">; // Type of source
    requiresScanner?: boolean;
    targetPlanetId?: string;
    targetPlanetName?: string;
    targetPlanetType?: string;
    planetType?: string; // For scan_planet contracts
    sectorId?: number;
    sectorName?: string;
    requiresVisit?: number;
    visited?: number;
    requiresTurns?: number;
    turnsSpent?: number;
    targetSectors?: number[];
    targetSectorNames?: string;
    visitedSectors?: number[];
    timeLimit?: number;
    startTurn?: number;
    targetThreat?: number;
    targetStationId?: string;
    targetStationName?: string;
    requiresPeaceful?: boolean;
    requiresAnomalies?: number;
    visitedAnomalies?: number;
    acceptedAt?: number;
    // Race-specific contracts
    requiredRace?: RaceId;
    isRaceQuest?: boolean;
    // Dominant race of the source planet (for normal contract rep gain)
    sourceDominantRace?: RaceId;
    // For specific enemy type quests
    enemyType?: EnemyShip;
    // For storm/rescue quests
    stormName?: string;
    requiredStormIntensity?: number; // Minimum storm intensity required
    // For mining quests (crystalline)
    bossDefeated?: boolean; // Track if boss has been defeated for artifact hunt
    requiredRarities?: ArtifactRarity[]; // Required artifact rarities for mining quest
    // For synthetic race quest
    requiresTechResearch?: boolean; // Complete by researching any technology
    requiredTechTier?: number; // Minimum tech tier required (1 = any, 2 = tier 2+, 3 = tier 3+)
    // For gas dive quest
    requiredMembranes?: number; // Total void_membrane to collect across dives
    collectedMembranes?: number; // Progress: void_membrane accumulated since accepting
    // For expedition survey quest
    requiredDiscoveries?: number; // Total tiles to reveal on target planet
    tilesRevealed?: number;       // Progress: tiles revealed so far
    expeditionDone?: boolean;     // Set when tilesRevealed >= requiredDiscoveries
}

export type ContractType =
    | "delivery"
    | "scan_planet"
    | "combat"
    | "rescue"
    | "mining"
    | "patrol"
    | "bounty"
    | "supply_run"
    | "diplomacy"
    | "rescueSurvivors"
    | "research"
    | "gas_dive"
    | "expedition_survey";

// Special delivery goods (quest items - given to player, not trade goods)
export type DeliveryGoods =
    | "spares"
    | "fuel"
    | "construction_materials"
    | "scientific_equipment"
    | "diplomatic_cargo";

// Battle results for showing after combat
export interface BattleResult {
    victory: boolean;
    enemyName: string;
    creditsEarned: number;
    modulesDamaged: { name: string; damage: number }[];
    modulesDestroyed: string[];
    crewWounded: { name: string; damage: number }[];
    crewKilled: string[];
    artifactFound?: string;
    researchResources?: { type: string; quantity: number }[];
}

// Storm results for showing after entering a storm
export interface StormResult {
    stormName: string;
    stormType: string;
    intensity: number;
    shieldDamage: number;
    moduleDamage: { name: string; damage: number }[];
    moduleDamagePercent: number;
    numModulesDamaged: number;
    crewDamage: number;
    creditsEarned: number;
    rareLoot: boolean;
    rareBonus?: number;
    specialResources?: { type: string; amount: number }[];
}
