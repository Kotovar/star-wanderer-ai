// Game Types for Space Terminal

// ═══════════════════════════════════════════════════════════════
// RACES - Galactic species system
// ═══════════════════════════════════════════════════════════════

export type RaceId =
    | "human"
    | "synthetic"
    | "xenosymbiont"
    | "krylorian"
    | "voidborn"
    | "crystalline";

export interface Race {
    id: RaceId;
    name: string;
    pluralName: string;
    adjective: string; // Adjective form for ship names (e.g., "Человеческий", "Крилорианский")
    description: string;
    homeworld?: string;

    // Biological characteristics
    biology: {
        lifespan: string;
        diet:
            | "omnivore"
            | "herbivore"
            | "carnivore"
            | "synthetic"
            | "energy"
            | "mineral";
        reproduction: string;
        specialNeeds?: string;
    };

    // Environment preferences (affects happiness on different planets)
    environmentPreference: {
        ideal: string[]; // Ideal planet types
        acceptable: string[]; // Acceptable planet types
        hostile: string[]; // Hostile planet types (happiness penalty)
    };

    // Crew bonuses
    crewBonuses: {
        happiness?: number; // Base happiness modifier
        health?: number; // Health regen modifier
        repair?: number; // Repair efficiency modifier
        science?: number; // Science/research modifier
        combat?: number; // Combat efficiency modifier
        energy?: number; // Energy consumption modifier (negative = less consumption)
        fuelEfficiency?: number; // Fuel efficiency modifier
        adaptation?: number; // Planet adaptation modifier
    };

    // Special traits
    specialTraits: RaceTrait[];

    // Race relations (-100 to 100, 0 = neutral)
    relations: Partial<Record<RaceId, number>>;

    // Flags
    hasHappiness: boolean; // Does this race have happiness?
    hasFatigue: boolean; // Does this race get tired?
    canGetSick: boolean; // Can this race get diseases?

    // Visual
    color: string; // Theme color for UI
    icon: string; // Emoji or symbol
}

export interface RaceTrait {
    id: string;
    name: string;
    description: string;
    type: "positive" | "negative" | "neutral";
    effects: Record<string, number | string>;
}

// ═══════════════════════════════════════════════════════════════

export interface Module {
    id: number;
    type: ModuleType;
    name: string;
    x: number;
    y: number;
    width: number;
    height: number;
    power?: number;
    consumption?: number;
    health: number;
    maxHealth?: number; // Maximum health for this module
    level?: number;
    capacity?: number; // For cargo and fuel tanks
    defense?: number; // Armor/defense value (reduces incoming damage)
    oxygen?: number;
    scanRange?: number;
    fuelEfficiency?: number; // For engines - lower is better (fuel per tier)
    disabled?: boolean;
    weapons?: Weapon[];
    movedThisTurn?: boolean; // Whether the module has been moved this turn
}

export type ModuleType =
    | "reactor"
    | "cockpit"
    | "lifesupport"
    | "cargo"
    | "weaponbay"
    | "shield"
    | "medical"
    | "scanner"
    | "habitat"
    | "engine"
    | "fueltank"
    | "drill"
    | "ai_core";

export interface Weapon {
    type: "kinetic" | "laser" | "missile";
}

export interface WeaponDetails {
    name: string;
    damage: number;
    color: string;
    icon: string;
    description: string;
    armorPenetration?: number;
    shieldBonus?: number;
    interceptChance?: number;
}

export interface CrewMember {
    id: number;
    name: string;
    race: RaceId; // Race of the crew member
    profession: Profession;
    level: number;
    exp: number;
    health: number;
    maxHealth: number; // Maximum health (modified by race bonuses)
    happiness: number;
    assignment: string | null; // Civilian assignment
    assignmentEffect: string | null; // Civilian assignment effect
    combatAssignment: string | null; // Combat assignment
    combatAssignmentEffect: string | null; // Combat assignment effect
    traits: CrewTrait[];
    moduleId: number; // ID of the module where the crew member is located
    movedThisTurn: boolean; // Whether the crew member has moved this turn
}

export type Profession =
    | "pilot"
    | "engineer"
    | "medic"
    | "scout"
    | "scientist"
    | "gunner";

export interface CrewTrait {
    name: string;
    desc: string;
    effect: Partial<Record<string, number>>;
    type: "positive" | "negative" | "neutral";
}

export type Quality = "poor" | "average" | "good" | "excellent";

export interface Location {
    id: string;
    type:
        | "station"
        | "planet"
        | "enemy"
        | "anomaly"
        | "friendly_ship"
        | "asteroid_belt"
        | "storm"
        | "distress_signal"
        | "ancient_boss";
    name: string;
    dominantRace: RaceId; // Dominant race on this planet/station
    stationType?: string;
    stationId?: string;
    planetType?: string;
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
    asteroidTier?: 1 | 2 | 3 | 4; // Higher = better resources, needs better drill (4 = ancient, requires ancient drill)
    resources?: { minerals: number; rare: number; credits: number };
    mined?: boolean;
    // Storm fields
    stormType?: "radiation" | "ionic" | "plasma";
    stormIntensity?: number; // 1-3, affects damage and loot quality
    stormLoot?: { credits: number; moduleDamage: number; shieldBurn: number };
    // Distress signal fields
    signalType?: "pirate_ambush" | "survivors" | "abandoned_cargo";
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

export interface Sector {
    id: number;
    name: string;
    danger: number;
    distance: number;
    tier: 1 | 2 | 3; // System tier (1=center, 2=middle, 3=outer)
    locations: Location[];
    star?: {
        type: "single" | "double" | "triple" | "blackhole";
        name: string;
    };
    mapX?: number;
    mapY?: number;
    mapAngle?: number; // Position on galaxy map (radians)
    mapRadius?: number; // Distance from center on galaxy map
    visited?: boolean; // Has player visited this sector
}

export interface Contract {
    id: string;
    type: ContractType;
    desc: string;
    cargo?: string;
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
    planetType?: string;
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
    | "escort"
    | "rescue"
    | "mining"
    | "patrol"
    | "data_courier"
    | "bounty"
    | "supply_run"
    | "diplomacy"
    | "research";

export interface CargoItem {
    item: string;
    quantity: number;
    contractId?: string;
    rewardValue?: number; // For special cargo like survivor capsules
}

export interface TradeGood {
    item: string;
    quantity: number;
    buyPrice: number;
}

export interface CombatState {
    enemy: {
        name: string;
        modules: EnemyModule[];
        selectedModule: number | null;
        shields: number;
        maxShields: number;
        // Boss-specific fields
        isBoss?: boolean;
        bossId?: string;
        regenRate?: number; // HP regenerated per turn
        specialAbility?: BossAbility;
        // For bounty contracts
        threat?: number;
    };
    loot: {
        credits: number;
        guaranteedArtifact?: string; // Bosses guarantee artifact
    };
    // Ambush - enemy attacks first (when no scanner and approaching unknown enemy ship)
    isAmbush?: boolean;
    ambushAttackDone?: boolean; // Track if ambush attack was already executed
    // Battle results (filled after victory)
    battleResults?: {
        damagedModules: { name: string; damage: number }[];
        destroyedModules: string[];
        woundedCrew: { name: string; damage: number }[];
        deadCrew: string[];
        creditsWon: number;
        artifactFound?: string;
    };
}

export interface EnemyModule {
    id: number;
    type: string;
    name: string;
    health: number;
    maxHealth?: number;
    damage?: number;
    defense?: number;
    // Boss-specific module features
    isAncient?: boolean; // Module not available to player
    regenRate?: number; // Self-regeneration
    specialEffect?: string; // e.g., 'shield_boost', 'damage_aura'
}

export interface LogEntry {
    message: string;
    type: "info" | "warning" | "error" | "combat";
    turn: number;
}

export interface ScoutingMission {
    planetId: string;
    scoutId: number;
    turnsLeft: number;
    startTurn: number;
}

export interface TravelingState {
    destination: Sector;
    turnsLeft: number;
    turnsTotal: number;
}

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

export interface GameState {
    turn: number;
    credits: number;
    currentSector: Sector | null;
    currentLocation: Location | null;
    gameMode: GameMode;
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
    activeEffects: ActiveEffect[]; // Active planet specialization effects
    planetCooldowns: Record<string, number>; // Track cooldowns per planet (planetId -> turnsRemaining)
}

export interface ActiveEffect {
    id: string;
    name: string;
    description: string;
    raceId: RaceId;
    turnsRemaining: number;
    effects: {
        type: string;
        value: number | string;
    }[];
}

export interface ShopItem {
    id: string;
    name: string;
    type: "upgrade" | "module" | "weapon";
    targetType?: ModuleType;
    moduleType?: ModuleType;
    width?: number;
    height?: number;
    power?: number;
    consumption?: number;
    defense?: number;
    scanRange?: number;
    oxygen?: number;
    capacity?: number; // For cargo, fuel tanks
    fuelEfficiency?: number; // For engine modules
    price: number;
    stock: number;
    effect?: {
        power?: number;
        capacity?: number;
        defense?: number;
        scanRange?: number;
        oxygen?: number;
        fuelEfficiency?: number;
        level?: number;
        healing?: number;
    };
    weaponType?: "kinetic" | "laser" | "missile";
    requiresWeaponBay?: boolean;
}

// Ancient Artifacts - unique items with special effects
export interface Artifact {
    id: string;
    name: string;
    description: string;
    effect: ArtifactEffect;
    negativeEffect?: ArtifactNegativeEffect; // For cursed artifacts
    discovered: boolean; // Has been found
    researched: boolean; // Has been studied by scientist
    hinted?: boolean; // Has been hinted at by synthetic archives
    requiresScientistLevel: number; // Level needed to research
    rarity: "rare" | "legendary" | "mythic" | "cursed"; // cursed = special category
    cursed?: boolean; // Is this a cursed artifact with negative effects
}

export interface ArtifactEffect {
    type: ArtifactType;
    value?: number; // Effect magnitude
    active?: boolean; // Is effect currently active
}

export interface ArtifactNegativeEffect {
    type: ArtifactNegativeType;
    value?: number; // Effect magnitude
    description: string; // Human-readable description
}

export type ArtifactType =
    // Positive effects
    | "free_power"
    | "damage_reflect"
    | "sector_teleport"
    | "shield_regen"
    | "fuel_free"
    | "crew_immortal"
    | "crit_chance"
    | "scan_boost"
    | "artifact_finder"
    | "damage_boost"
    // Cursed positive effects
    | "abyss_power" // Big power boost but happiness drain
    | "all_seeing" // See all enemies but more ambushes
    | "undying_crew" // Crew can't die but mutates
    | "credit_booster" // More credits but random damage
    | "auto_repair" // Auto repair but crew leaves
    | "critical_overload" // Massive crit but self damage
    | "dark_shield" // Strong shield but morale drain
    | "void_engine" // Free travel but crew suffering
    | "module_armor"; // Bonus armor to all modules

export type ArtifactNegativeType =
    | "happiness_drain" // -X happiness per turn
    | "ambush_chance" // +X% ambush chance
    | "crew_mutation" // Random negative traits
    | "module_damage" // Random module damage
    | "crew_desertion" // Chance crew leaves
    | "self_damage" // Damage to own ship
    | "morale_drain" // -X morale per turn
    | "health_drain"; // -X crew health per turn

// ═══════════════════════════════════════════════════════════════
// ANCIENT BOSSES - Relicts of lost civilization
// ═══════════════════════════════════════════════════════════════

export interface AncientBoss {
    id: string;
    name: string;
    description: string;
    tier: 1 | 2 | 3; // Minimum sector tier to spawn
    modules: BossModule[];
    shields: number;
    regenRate: number; // HP regenerated per turn in combat
    specialAbility: BossAbility;
    guaranteedArtifactRarity: "rare" | "legendary" | "mythic" | "cursed";
}

export interface BossModule {
    type: string;
    name: string;
    health: number;
    damage?: number;
    defense?: number;
    isAncient: boolean; // Module not available to player
    specialEffect?: string;
    description: string;
}

export interface BossAbility {
    name: string;
    description: string;
    trigger: "every_turn" | "low_health" | "on_damage";
    effect: string;
    value?: number;
}

export interface PlanetSpecialization {
    id: string;
    name: string;
    description: string;
    icon: string;
    cost: number;
    duration: number;
    cooldown?: number;
    requirements?: {
        minLevel?: number;
        maxLevel?: number;
        requiredModule?: string;
        requiredRace?: RaceId;
    };
    effects: {
        type: string;
        value: number | string;
        description: string;
    }[];
}
