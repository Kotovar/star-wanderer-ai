import type { Artifact } from "./artifacts";
import type { CargoItem } from "./cargo";
import type { CombatState } from "./combat";
import type { CombatTurnTimeline } from "./combatCinematics";
import type { BattleResult, Contract, ContractCompletionResult, StormResult } from "./contracts";
import type { GainExpResult } from "@/game/slices/crew/helpers/calculateGainExpResult";
import type {
  CrewMember,
  CrewMemberAssignment,
  CrewMemberCombatAssignment,
  CrewAutomationState,
  HireCrewResult,
  TechPerkBranch,
  TechPerkTier,
} from "./crew";
import type { ActiveEffect } from "./effects";
import type { Goods, TradeGood } from "./goods";
import type { PendingTravelEvent, Sector, TravelingState } from "./locations/sectors";
import type {
  Location,
  LocationType,
  AnomalyApproach,
  DerelictApproach,
  DistressApproach,
  SurfaceLogEntry,
  WreckApproach,
} from "./locations/locations";
import type { LogEntry } from "./logs";
import type { GasType, Outpost } from "./outposts";
import type { JettisonTarget } from "@/game/slices/ship/helpers/jettison";
import type { OutpostsSlice } from "@/game/slices/outposts/createOutpostsSlice";
import type { Module, WeaponCounts, WeaponType } from "./modules";
import type { RaceId } from "./races";
import type { ReputationLevel } from "./reputation";
import type { ShipMergeTrait } from "./ships";
import type { StationName } from "./stations";
import type { ResearchData, TechnologyId } from "./research";
import type { CraftingRecipeId, ModuleRecipeId } from "./crafting";
import type { ShopItem } from "./shops";
import type { AugmentationId } from "./augmentations";
import type {
  DiveState,
  ExpeditionScanMode,
  ExpeditionState,
} from "./exploration";
import type { ActiveCrisisState, CrisisResponse } from "./crisis";
import type {
  PendingRandomEvent,
  RandomEventChoiceId,
  ScheduledRandomEventConsequence,
} from "./randomEvents";
import type { RunProfileId } from "@/game/galaxy/runProfiles";
import type { GalaxyTierAll, Nebula } from "./locations/galaxy";
import type { KnownLocationIntel, NavigatorTarget } from "./navigator";
import type { NavigatorSlice } from "@/game/slices/navigator/createNavigatorSlice";

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
  | "effects"
  | "unknown_ship"
  | "battle_results"
  | "storm_results"
  | "research"
  | "navigator"
  | "reputation"
  | "crises"
  | "enemy_codex"
  | "derelict_ship"
  | "gas_giant"
  | "wreck_field"
  | "space_monster"
  | "hostile_approach_warning";

export interface RunProfileArcTarget {
  profileId: RunProfileId;
  sectorId: number;
  locationId: string;
  tier: GalaxyTierAll;
}

export interface CrewLevelUpResult {
  crewMemberId: number;
  crewMemberName: string;
  oldLevel: number;
  newLevel: number;
  previousMaxHealth: number;
  newMaxHealth: number;
  previousHealth: number;
  restoredHealth: number;
}

export interface GameState {
  /** Версия состояния для миграций сохранений */
  stateVersion: number;
  turn: number;
  credits: number;
  /** Валовые поступления кредитов в текущем забеге, без стартового баланса */
  creditsEarnedThisRun: number;
  probes: number;
  currentSector: Sector | null;
  currentLocation: Location | null;
  gameMode: GameMode;
  previousGameMode: GameMode | null; // Track previous game mode for modal-like panels
  traveling: TravelingState | null;
  pendingTravelEvent: PendingTravelEvent | null;
  pendingRandomEvent: PendingRandomEvent | null;
  scheduledRandomEventConsequence: ScheduledRandomEventConsequence | null;
  pendingScoutEvent: { planetId: string; eventId: string } | null; // Ожидающее событие разведки пустой планеты
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
    bonusDamage?: number; // Damage bonus from planet and gameplay effects (as multiplier, e.g. 0.1 = +10%)
    bonusShieldRegen?: number; // Temporary shield regen bonus from planet effects (per turn)
    mergeTraits?: ShipMergeTrait[]; // Traits from xenosymbiont merging with ship
  };
  crew: CrewMember[];
  crewAutomation: CrewAutomationState;
  galaxy: {
    sectors: Sector[];
    nebulae: Nebula[];
  };
  activeContracts: Contract[];
  completedContractIds: string[]; // IDs of completed contracts to prevent retaking
  pendingContractCompletions: ContractCompletionResult[]; // Очередь результатов успешно выполненных контрактов
  pendingCrewLevelUps: CrewLevelUpResult[];
  shipQuestsTaken: string[]; // IDs of ships where quest was taken
  hiredCrewFromShips: string[]; // IDs of friendly ships where crew was hired
  distressRespondedShips: string[]; // IDs of distress ships that have been helped
  completedLocations: string[];
  /** Постройки игрока: живут в состоянии, а не в локациях — сектор пересобирается из galaxy при перезаходе */
  outposts: Outpost[];
  /** Газ с аванпостов. Отдельный пул, а не Goods: расширять торговый union ради четырёх позиций дороже, чем оно того стоит */
  gases: Partial<Record<GasType, number>>;
  /** Какую постройку сейчас отбиваем — чтобы вернуть её при победе */
  assaultingOutpostId?: string | null;
  knownLocationIntel: Record<string, KnownLocationIntel>;
  navigatorTargets: NavigatorTarget[];
  /** Станции, где игрок реально был в доке — их цены считаются известными */
  knownTradeStations: string[];
  stationInventory: Record<string, Record<string, number>>;
  stationPrices: Record<
    string,
    Record<string, { buy: number; sell: number }>
  >;
  stationStock: Record<string, Record<string, number>>;
  emergencyFuelStationIds: string[];
  friendlyShipStock: Record<string, Record<string, number>>; // Stock on friendly ships
  currentCombat: CombatState | null;
  log: LogEntry[];
  randomEventCooldown: number;
  hiredCrew: Record<string, string[]>;
  artifacts: Artifact[]; // Ancient artifacts discovered by player
  knownRaces: RaceId[]; // Races discovered by player
  raceReputation: Record<RaceId, number>; // Reputation with each race (-100 to 100)
  gameLoadedCount: number; // Counter to track game loads (prevents modal re-show)
  battleResult: BattleResult | null; // Results of last battle
  stormResult: StormResult | null; // Results of last storm entry
  gameOver: boolean; // Game over state
  gameOverReason: string | null; // Reason for game over
  gameVictory: boolean; // Victory state
  gameVictoryReason: string | null; // Reason for victory
  victoryTriggered: boolean; // At least one victory was triggered in this campaign
  completedVictoryObjectiveIds: string[]; // Final paths already recorded
  activeEffects: ActiveEffect[]; // Active effects from planets and gameplay
  planetCooldowns: Record<string, number>; // Track cooldowns per planet (planetId -> turnsRemaining)
  research: ResearchData; // Research system data
  moduleRecipes: ModuleRecipeId[]; // One-time module blueprint recipes found by Scout
  pendingSurvivor: CrewMember | null; // Survivor awaiting player accept/decline
  activeExpedition: ExpeditionState | null; // Active planet surface expedition
  activeDive: DiveState | null; // Active gas giant dive
  settings: {
    animationsEnabled: boolean; // Sector map animations toggle
    soundEnabled: boolean;
    master: number;
    music: number;
    sfx: number;
    ui: number;
  };
  // Map zoom state (persisted between map switches)
  galaxyZoom: number; // Galaxy map zoom level (default 1)
  sectorZoom: number; // Sector map zoom level (default 1)
  galaxyOffset: { x: number; y: number }; // Galaxy map pan offset
  sectorOffset: { x: number; y: number }; // Sector map pan offset
  bannedPlanets: string[]; // Planet location IDs permanently hostile (guard killed there)
  diplomaticTranslatorRaceIds: RaceId[]; // Races with a hired translator (permanent diplomacy cost discount)
  startTemplateId?: string; // Ship template used to start this game (undefined = old save)
  startModifierIds: string[]; // Launch modifiers and selected doctrine
  runProfileId: RunProfileId | null;
  runProfileArcRewardClaimed: boolean;
  runProfileArcTarget: RunProfileArcTarget | null;
  activeCrisis: ActiveCrisisState | null; // Currently active global crisis
  discoveredCrisisIds: string[]; // Crises already encountered by the player
  discoveredEnemyCodexIds: string[]; // Enemy types already encountered by the player
  discoveredStationTypes: StationName[]; // Station types already docked with in this run
  discoveredAugmentationIds: AugmentationId[]; // Augmentations seen at medical stations or installed on crew
  discoveredWeaponTypes: WeaponType[]; // Weapon types ever equipped on the player's ship
  nextCrisisTurn: number; // Turn on which the next global crisis triggers
  nextCrisisId: string | null; // Crisis selected to trigger next
  // ── Мета-прогрессия (см. META_PROGRESSION_PLAN.md) ──
  /** Уникальный id текущего забега, генерируется в restartGame. Нужен для идемпотентности recordRunResult. */
  runId: string;
  /** Боссов повержено в этом забеге — сбрасывается рестартом, суммируется в мета-стор при конце забега */
  bossesDefeatedThisRun: number;
  /** Максимальный threat/tier врага, побеждённого в этом забеге */
  maxEnemyThreatDefeatedThisRun: number;
  /** Наибольшее число членов экипажа 10-го уровня одновременно за забег */
  maxLevel10CrewCountThisRun: number;
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
  /** Выбрасывает груз за борт: необратимо, без возмещения */
  jettisonCargo: (target: JettisonTarget, quantity: number) => void;
  getEffectiveScanRange: () => number;
  canScanObject: (objectType: LocationType, objectTier?: number) => boolean;
  getEarlyWarningChance: (threatLevel: number) => number;
  getSignalRevealChance: () => number;
  calculateFuelCost: (targetSectorId: number) => number;
  areEnginesFunctional: () => boolean;
  areFuelTanksFunctional: () => boolean;
  refuel: (amount: number, price: number) => void;
  burnDeuterium: (units: number) => void;
  gainExp: (crewMember: CrewMember | undefined, amount: number) => GainExpResult | undefined;
  hydratePlayerSettings: () => void;
  setAnimationsEnabled: (enabled: boolean) => void;
  setSoundEnabled: (enabled: boolean) => void;
  setAudioVolume: (category: "master" | "music" | "sfx" | "ui", value: number) => void;
  setGalaxyZoom: (zoom: number) => void;
  setSectorZoom: (zoom: number) => void;
  setGalaxyOffset: (offset: { x: number; y: number }) => void;
  setSectorOffset: (offset: { x: number; y: number }) => void;
}

export interface GameActionsClick {
  nextTurn: () => void;
  skipTurn: () => CombatTurnTimeline | null;
  resolveCrisis: (response: CrisisResponse) => void;
  resolveRandomEvent: (choice: RandomEventChoiceId) => void;
  selectSector: (sectorId: number, route?: "direct" | "detour") => void;
  selectLocation: (locationIdx: number) => void;
  resolveTravelEvent: (choice: "risk" | "cautious" | "special") => void;
  travelThroughBlackHole: () => void;
  emergencyJump: () => void;
  mineAsteroid: () => void;
  enterStorm: () => void;
}

export interface GameModeChanges {
  showGalaxyMap: () => void;
  showSectorMap: () => void;
  showAssignments: () => void;
  closeAssignments: () => void;
  showCrises: () => void;
  showEnemyCodex: () => void;
  showEffects: () => void;
  closeArtifactsPanel: () => void;
  closeResearchPanel: () => void;
  showNavigator: () => void;
  closeNavigator: () => void;
  savePreviousGameMode: () => void;
}

export interface GameCombat {
  startCombat: (enemy: Location, isAmbush?: boolean) => void;
  startBossCombat: (bossLocation: Location) => void;
  selectEnemyModule: (moduleId: number) => void;
  attackEnemy: () => void;
  attackEnemyWithBayTargets: (bayTargets: Record<number, number | null>) => CombatTurnTimeline | null;
  executeAmbushAttack: () => void; // Execute enemy attack for ambush (first strike)
  processEnemyAttack: () => void; // Process enemy counter-attack during combat
  retreat: () => CombatTurnTimeline | null;
  attackFriendlyShip: () => void; // Player-initiated attack on a friendly ship (-20 rep)
  confirmHostileApproach: () => void; // Confirm approaching a hostile location (start combat)
  cancelHostileApproach: () => void; // Cancel approaching a hostile location (return to sector map)
  recoverModuleWithNanites: (moduleId: number) => void;
}

export interface GameStationAndPlanets {
  buyItem: (item: ShopItem, targetModuleId?: number) => void;
  repairShip: () => void;
  healCrew: () => void;
  cureMutation: (crewId: number, traitId: string) => void;
  treatNegativeTrait: (crewId: number, traitId: string) => void;
  stabilizeNebulaFront: () => void;
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
    confirmOxygen?: boolean,
  ) => HireCrewResult;
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
  setCrewAutomationEnabled: (enabled: boolean) => void;
  prioritizeFuelSynthesis: (targetFuel: number) => void;
  moveCrewMember: (crewId: number, targetModuleId: number) => void;
  isModuleAdjacent: (moduleId1: number, moduleId2: number) => boolean;
  getCrewInModule: (moduleId: number) => CrewMember[];
  gainExp: (crewMember: CrewMember, amount: number) => GainExpResult | undefined;
  acceptSurvivor: () => void;
  declineSurvivor: () => void;
  chooseCrewPerk: (
    crewMemberId: number,
    tier: TechPerkTier,
    branch: TechPerkBranch,
  ) => void;
}

export interface GameContracts {
  acceptContract: (contract: Contract) => boolean;
  completeDeliveryContract: (contractId: string) => void;
  cancelContract: (contractId: string) => void;
  showContractCompletion: (completion: ContractCompletionResult) => void;
  dismissContractCompletion: () => void;
}

export interface GameModule {
  toggleModule: (moduleId: number) => void;
  enableAllModules: () => void;
  scrapModule: (moduleId: number) => void;
  removeWeapon: (moduleId: number, weaponIndex: number) => void;
  moveModule: (moduleId: number, x: number, y: number) => void;
  canPlaceModule: (module: Module, x: number, y: number) => boolean;
}

export interface GameAnomaly {
  handleAnomaly: (anomaly: Location, approach?: AnomalyApproach) => void;
}

export interface GameSpaceMonsters {
  resonateWithSpaceMonster: () => void;
  cleanseCursedArtifact: (artifactId: string) => void;
}

export interface GameScouting {
  sendScoutingMission: (planetId: string) => void;
  planetaryDrill: (planetId: string) => void;
  atmosphericAnalysis: (planetId: string) => void;
  orbitalScan: (planetId: string) => void;
  resolveScoutEvent: (choiceIndex: number) => SurfaceLogEntry | null;
  exploreDerelictShip: (locationId: string, approach: DerelictApproach) => void;
  startExpedition: (planetId: string, crewIds: number[]) => void;
  revealExpeditionTile: (tileIndex: number) => void;
  scanExpeditionTile: (
    tileIndex: number,
    scanMode?: ExpeditionScanMode,
  ) => void;
  resolveRuinsChoice: (choiceIndex: number) => void;
  diveDeeperIntoRuins: () => void;
  confirmRuinsOutcome: () => void;
  endExpedition: () => void;
  abortExpedition: () => void;
  startDive: (locationId: string) => void;
  resolveDiveEvent: (choiceIndex: number) => void;
  diveDeeper: () => void;
  surfaceDive: () => void;
  abandonDive: () => void;
  salvageWreckField: (approach?: WreckApproach) => void;
  buyProbe: (count: number) => void;
}

export interface GameDistressSignal {
  respondToDistressSignal: (approach?: DistressApproach) => void;
  deepScanDistressSignal: () => void;
  probeDistressSignal: () => void;
}

export interface GameArtifacts {
  researchArtifact: (artifactId: string) => void;
  toggleArtifact: (artifactId: string) => void;
  tryFindArtifact: () => Artifact | null;
  showArtifacts: () => void;
  showResearch: () => void;
  closeArtifactsPanel: () => void;
}

export interface GameRaces {
  discoverRace: (raceId: RaceId) => void;
  discoverStationType: (stationType: StationName) => void;
  discoverWeaponTypes: (weaponTypes: WeaponType[]) => void;
}

export interface GameReputation {
  changeReputation: (raceId: RaceId, amount: number) => void;
  setReputation: (raceId: RaceId, value: number) => void;
  getReputation: (raceId: RaceId) => number;
  getReputationLevel: (raceId: RaceId) => ReputationLevel;
  showReputation: () => void;
  closeReputationPanel: () => void;
  sendDiplomaticGift: (raceId: RaceId, amount: number) => void; // Pay variable credits to improve rep (diplomatic station)
  removePlanetBan: (locationId: string) => void; // Pay to lift a permanent planet ban (diplomatic station)
  hireTranslator: (raceId: RaceId) => void; // Permanent diplomacy cost discount for one race (diplomatic station)
}

export interface GamePlanetSpecializations {
  trainCrew: (crewMemberId: number) => void;
  retrainCrew: (crewMemberId: number, profession: CrewMember["profession"]) => void;
  scanSector: () => void;
  boostArtifact: (artifactId: string) => void;
  activatePlanetEffect: (raceId: RaceId, planetId?: string) => void;
  removeExpiredEffects: () => void;
}

export interface GameFinish {
  checkGameOver: () => void;
  checkVictory: () => void;
  triggerVictory: () => void;
}

export interface GameResearch {
  startResearch: (techId: TechnologyId) => void;
  processResearch: () => void;
  activateResearchBoost: () => void;
}

export interface GameCrafting {
  craftWeapon: (recipeId: CraftingRecipeId) => void;
  installCraftedWeapon: (cargoIndex: number, weaponBayId: number) => void;
  craftModule: (recipeId: ModuleRecipeId) => void;
}

export interface GameAugmentations {
  installAugmentation: (
    crewId: number,
    augmentationId: AugmentationId,
  ) => void;
  removeAugmentation: (crewId: number) => void;
}

export interface GameScanContracts {
  processScanContracts: () => Contract[];
  completeScanContracts: () => void;
  handleDiplomacyContracts: (locationIdx: number) => void;
  handleSupplyRunContracts: (locationIdx: number) => void;
  handleGasDiveContracts: (locationIdx: number) => void;
  handleCrisisResponseContracts: (locationIdx: number) => void;
  handleFabricationContracts: (locationIdx: number) => void;
  handleExpeditionSurveyContracts: (locationIdx: number) => void;
}

export interface GameManagement {
  restartGame: (templateId?: string, modifierIds?: string[], profileId?: RunProfileId) => void;
  resetProgress: () => void;
  saveGame: () => void;
  loadGame: () => boolean;
  saveToSlot: (slotId: "manual1" | "manual2" | "manual3" | "manual4" | "manual5", name?: string) => void;
  loadFromSlot: (slotId: "auto" | "manual1" | "manual2" | "manual3" | "manual4" | "manual5") => void;
  dismissCrewLevelUp: () => void;
}

export type GameStore = GameState &
  NavigatorSlice &
  OutpostsSlice &
  GameActions &
  GameActionsClick &
  GameModeChanges &
  GameCombat &
  GameStationAndPlanets &
  GameCrew &
  GameContracts &
  GameModule &
  GameAnomaly &
  GameSpaceMonsters &
  GameScouting &
  GameDistressSignal &
  GameArtifacts &
  GameRaces &
  GameReputation &
  GamePlanetSpecializations &
  GameFinish &
  GameResearch &
  GameCrafting &
  GameAugmentations &
  GameScanContracts &
  GameManagement;
