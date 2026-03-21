import type { Artifact } from "./artifacts";
import type { CargoItem } from "./cargo";
import type { CombatState } from "./combat";
import type { BattleResult, Contract, StormResult } from "./contracts";
import type {
    CrewMember,
    CrewMemberAssignment,
    CrewMemberCombatAssignment,
} from "./crew";
import type { ActiveEffect } from "./effects";
import type { Goods, TradeGood } from "./goods";
import type { Sector, TravelingState } from "./locations/sectors";
import type { Location, LocationType } from "./locations/locations";
import type { LogEntry } from "./logs";
import type { Module, WeaponCounts } from "./modules";
import type { RaceId } from "./races";
import type { ShipMergeTrait } from "./ships";
import type { ResearchData, TechnologyId } from "./research";
import type { CraftingRecipeId } from "./crafting";
import type { ShopItem } from "./shops";

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
    | "battle_results"
    | "storm_results"
    | "research";

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
        bonusDamage?: number; // Temporary damage bonus from planet effects (as multiplier, e.g. 0.15 = +15%)
        bonusShieldRegen?: number; // Temporary shield regen bonus from planet effects (per turn)
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
    hiredCrew: Record<string, string[]>;
    artifacts: Artifact[]; // Ancient artifacts discovered by player
    knownRaces: RaceId[]; // Races discovered by player
    gameLoadedCount: number; // Counter to track game loads (prevents modal re-show)
    battleResult: BattleResult | null; // Results of last battle
    stormResult: StormResult | null; // Results of last storm entry
    gameOver: boolean; // Game over state
    gameOverReason: string | null; // Reason for game over
    gameVictory: boolean; // Victory state (reached tier 4)
    gameVictoryReason: string | null; // Reason for victory
    victoryTriggered: boolean; // Persistent flag — prevents re-triggering after "Continue"
    activeEffects: ActiveEffect[]; // Active planet specialization effects
    planetCooldowns: Record<string, number>; // Track cooldowns per planet (planetId -> turnsRemaining)
    research: ResearchData; // Research system data
    pendingSurvivor: CrewMember | null; // Survivor awaiting player accept/decline
    settings: {
        animationsEnabled: boolean; // Sector map animations toggle
    };
}

export interface GameActions {
    addLog: (message: string, type?: LogEntry["type"]) => void;
    updateShipStats: () => void;
    getTotalPower: () => number;
    getTotalConsumption: () => number;
    getTotalDamage: () => WeaponCounts & {
        total: number;
    };
    getCrewCapacity: () => number;
    getOxygenCapacity: () => number;
    getFuelCapacity: () => number;
    getFuelEfficiency: () => number;
    getDrillLevel: () => number;
    getCargoCapacity: () => number;
    getEffectiveScanRange: () => number;
    canScanObject: (objectType: LocationType, objectTier?: number) => boolean;
    getEarlyWarningChance: (threatLevel: number) => number;
    getSignalRevealChance: () => number;
    calculateFuelCost: (targetSectorId: number) => number;
    areEnginesFunctional: () => boolean;
    areFuelTanksFunctional: () => boolean;
    refuel: (amount: number, price: number) => void;
    gainExp: (crewMember: CrewMember | undefined, amount: number) => void;
    setAnimationsEnabled: (enabled: boolean) => void;
}

export interface GameActionsClick {
    nextTurn: () => void;
    skipTurn: () => void;
    selectSector: (sectorId: number) => void;
    selectLocation: (locationIdx: number) => void;
    travelThroughBlackHole: () => void;
    emergencyJump: () => void;
    mineAsteroid: () => void;
    enterStorm: () => void;
}

export interface GameModeChanges {
    showGalaxyMap: () => void;
    showSectorMap: () => void;
    showAssignments: () => void;
    closeArtifactsPanel: () => void;
    closeResearchPanel: () => void;
    savePreviousGameMode: () => void;
}

export interface GameCombat {
    startCombat: (enemy: Location, isAmbush?: boolean) => void;
    startBossCombat: (bossLocation: Location) => void;
    selectEnemyModule: (moduleId: number) => void;
    attackEnemy: () => void;
    executeAmbushAttack: () => void; // Execute enemy attack for ambush (first strike)
    processEnemyAttack: () => void; // Process enemy counter-attack during combat
    retreat: () => void;
}

export interface GameStationAndPlanets {
    buyItem: (item: ShopItem, targetModuleId?: number) => void;
    repairShip: () => void;
    healCrew: () => void;
    cureMutation: (crewId: number, traitId: string) => void;
    buyTradeGood: (goodId: Goods, quantity?: number) => void;
    sellTradeGood: (goodId: Goods, quantity?: number) => void;
    installModuleFromCargo: (cargoIndex: number, x: number, y: number) => void;
    // Services - dynamic pricing and availability
    getRepairCost: () => {
        cost: number;
        damagePercent: number;
        canUse: boolean;
    };
    getHealCost: () => { cost: number; damagePercent: number; canUse: boolean };
    canRepairShip: () => boolean;
    canHealCrew: () => boolean;
}

export interface GameCrew {
    hireCrew: (
        crewData: Partial<CrewMember> & { price: number },
        locationId?: string,
    ) => void;
    fireCrewMember: (crewId: number) => void;
    assignCrewTask: (
        crewId: number,
        task: CrewMemberAssignment,
        effect: string | null,
    ) => void;
    assignCombatTask: (
        crewId: number,
        task: CrewMemberCombatAssignment,
        effect: string,
    ) => void;
    moveCrewMember: (crewId: number, targetModuleId: number) => void;
    isModuleAdjacent: (moduleId1: number, moduleId2: number) => boolean;
    getCrewInModule: (moduleId: number) => CrewMember[];
    gainExp: (crewMember: CrewMember, amount: number) => void;
    acceptSurvivor: () => void;
    declineSurvivor: () => void;
}

export interface GameContracts {
    acceptContract: (contract: Contract) => void;
    completeDeliveryContract: (contractId: string) => void;
    cancelContract: (contractId: string) => void;
}

export interface GameModule {
    toggleModule: (moduleId: number) => void;
    scrapModule: (moduleId: number) => void;
    removeWeapon: (moduleId: number, weaponIndex: number) => void;
    moveModule: (moduleId: number, x: number, y: number) => void;
    canPlaceModule: (module: Module, x: number, y: number) => boolean;
}

export interface GameAnomaly {
    handleAnomaly: (anomaly: Location) => void;
}

export interface GameScouting {
    sendScoutingMission: (planetId: string) => void;
    planetaryDrill: (planetId: string) => void;
    atmosphericAnalysis: (planetId: string) => void;
}

export interface GameDistressSignal {
    respondToDistressSignal: () => void;
}

export interface GameArtifacts {
    researchArtifact: (artifactId: string) => void;
    toggleArtifact: (artifactId: string) => void;
    tryFindArtifact: () => Artifact | null;
    showArtifacts: () => void;
    showResearch: () => void;
}

export interface GameRaces {
    discoverRace: (raceId: RaceId) => void;
}

export interface GamePlanetSpecializations {
    trainCrew: (crewMemberId: number) => void;
    scanSector: () => void;
    boostArtifact: (artifactId: string) => void;
    activatePlanetEffect: (raceId: RaceId, planetId?: string) => void;
    removeExpiredEffects: () => void;
}

export interface GameFinish {
    checkGameOver: () => void;
    triggerVictory: () => void;
}

export interface GameResearch {
    startResearch: (techId: TechnologyId) => void;
    processResearch: () => void;
}

export interface GameCrafting {
    craftWeapon: (recipeId: CraftingRecipeId) => void;
    installCraftedWeapon: (cargoIndex: number, weaponBayId: number) => void;
}

export interface GameScanContracts {
    processScanContracts: () => Contract[];
    completeScanContracts: () => void;
    handleDiplomacyContracts: (locationIdx: number) => void;
    handleSupplyRunContracts: (locationIdx: number) => void;
}

export interface GameManagement {
    restartGame: () => void;
    saveGame: () => void;
    loadGame: () => boolean;
}

export type GameStore = GameState &
    GameActions &
    GameActionsClick &
    GameModeChanges &
    GameCombat &
    GameStationAndPlanets &
    GameCrew &
    GameContracts &
    GameModule &
    GameAnomaly &
    GameScouting &
    GameDistressSignal &
    GameArtifacts &
    GameRaces &
    GamePlanetSpecializations &
    GameFinish &
    GameResearch &
    GameCrafting &
    GameScanContracts &
    GameManagement;
