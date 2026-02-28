import type { Artifact } from "./artifacts";
import type { CargoItem } from "./cargo";
import type { CombatState } from "./combat";
import type { BattleResult, Contract, ScoutingMission } from "./contracts";
import type { CrewMember } from "./crew";
import type { ActiveEffect } from "./effects";
import type { TradeGood } from "./goods";
import type { Sector, TravelingState } from "./locations/sectors";
import type { Location } from "./locations/locations";
import type { LogEntry } from "./logs";
import type { Module } from "./modules";
import type { RaceId } from "./races";
import type { ShipMergeTrait } from "./ships";

export type GameMode =
    | "galaxy_map"
    | "sector_map"
    | "station"
    | "planet"
    | "combat"
    | "friendly_ship"
    | "anomaly"
    | "assignments"
    | "asteroid_belt"
    | "storm"
    | "distress_signal"
    | "artifacts"
    | "unknown_ship"
    | "battle_results";

export interface GameState {
    turn: number;
    credits: number;
    currentSector: Sector | null;
    currentLocation: Location | null;
    gameMode: GameMode;
    previousGameMode: GameMode | null; // Track previous game mode for modal-like panels
    traveling: TravelingState | null;
    ship: {
        armor: number;
        shields: number;
        maxShields: number;
        crewCapacity: number;
        modules: Module[];
        gridSize: number;
        cargo: CargoItem[];
        tradeGoods: TradeGood[];
        fuel: number; // Current fuel
        maxFuel: number; // Max fuel capacity from all fuel tanks
        moduleMovedThisTurn?: boolean; // Track if a module was moved this turn
        bonusPower?: number; // Temporary power bonus from planet effects
        bonusShields?: number; // Temporary shield bonus from planet effects
        bonusEvasion?: number; // Temporary evasion bonus from planet effects (as percentage)
        mergeTraits?: ShipMergeTrait[]; // Traits from xenosymbiont merging with ship
    };
    crew: CrewMember[];
    galaxy: {
        sectors: Sector[];
    };
    activeContracts: Contract[];
    completedContractIds: string[]; // IDs of completed contracts to prevent retaking
    shipQuestsTaken: string[]; // IDs of ships where quest was taken
    hiredCrewFromShips: string[]; // IDs of friendly ships where crew was hired
    completedLocations: string[];
    stationInventory: Record<string, Record<string, number>>;
    stationPrices: Record<
        string,
        Record<string, { buy: number; sell: number }>
    >;
    stationStock: Record<string, Record<string, number>>;
    friendlyShipStock: Record<string, Record<string, number>>; // Stock on friendly ships
    currentCombat: CombatState | null;
    log: LogEntry[];
    randomEventCooldown: number;
    scoutingMissions: ScoutingMission[];
    hiredCrew: Record<string, string[]>;
    artifacts: Artifact[]; // Ancient artifacts discovered by player
    knownRaces: RaceId[]; // Races discovered by player
    battleResult: BattleResult | null; // Results of last battle
    gameOver: boolean; // Game over state
    gameOverReason: string | null; // Reason for game over
    gameVictory: boolean; // Victory state (reached tier 4)
    gameVictoryReason: string | null; // Reason for victory
    activeEffects: ActiveEffect[]; // Active planet specialization effects
    planetCooldowns: Record<string, number>; // Track cooldowns per planet (planetId -> turnsRemaining)
}
