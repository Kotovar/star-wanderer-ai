import type { RaceId } from "./races";

export interface Contract {
    id: string;
    type: ContractType;
    desc: string;
    cargo?: string;
    quantity?: number; // For supply_run contracts
    targetSector?: number;
    targetSectorName?: string;
    targetLocationId?: string; // Specific location to deliver to (planet, station, ship)
    targetLocationName?: string; // Name of target location
    targetLocationType?: "planet" | "station" | "ship"; // Type of target location
    sourcePlanetId?: string;
    sourceSectorName?: string;
    sourceName?: string; // Name of the source (planet or ship)
    sourceType?: "planet" | "ship"; // Type of source
    reward: number;
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
    // For specific enemy type quests
    enemyType?: string;
    // For storm/rescue quests
    stormName?: string;
    // For mining quests (crystalline)
    bossDefeated?: boolean; // Track if boss has been defeated for artifact hunt
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
    | "research";

// Special delivery goods (quest items - given to player, not trade goods)
export type DeliveryGoods =
    | "spares"
    | "fuel"
    | "construction_materials"
    | "scientific_equipment"
    | "diplomatic_cargo";

export interface ScoutingMission {
    planetId: string;
    scoutId: number;
    turnsLeft: number;
    startTurn: number;
}

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
}
