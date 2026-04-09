import { ANCIENT_ARTIFACTS } from "@/game/constants/artifacts";
import { RESEARCH_TREE } from "@/game/constants";
import { generateGalaxy } from "@/game/galaxy/generateGalaxy";
import { initialModules, STARTING_FUEL } from "@/game/modules/initial";
import { initializeStationData } from "@/game/stations/initialize";
import { buildCrewMember } from "@/game/crew/buildCrewMember";
import { applyResearchedTechs } from "@/game/research/applyResearchedTechs";
import type { GameState, CrewMember, TechnologyId, RaceId } from "@/game/types";

/** Начальный номер хода */
const INITIAL_TURN = 1;

/** Начальное количество кредитов игрока */
const INITIAL_CREDITS = 1000;

/**
 * Начальная вместимость экипажа.
 * Берётся из модуля жизнеобеспечения, по умолчанию 5.
 */
const INITIAL_CREW_CAPACITY =
  initialModules.find((module) => module.oxygen !== undefined)?.oxygen ?? 5;

/** Начальный размер сетки модулей корабля */
const INITIAL_GRID_SIZE = 5;

/** Начальный режим игры — карта галактики */
const INITIAL_GAME_MODE = "galaxy_map" as const;

/** Начальная раса, известная игроку */
const INITIAL_KNOWN_RACE = "human" as const;

/** Начальная репутация со всеми расами (0 = нейтрал) */
const INITIAL_RACE_REPUTATION: Record<RaceId, number> = {
  human: 0,
  synthetic: 0,
  xenosymbiont: 0,
  krylorian: 0,
  voidborn: 0,
  crystalline: 0,
};

/** Начальные технологии — все с флагом discovered: true в константах */
const INITIAL_DISCOVERED_TECHS: TechnologyId[] = Object.values(RESEARCH_TREE)
  .filter((tech) => tech.discovered)
  .map((tech) => tech.id);

/** Счётчик загрузок игры (для предотвращения показа модалок после загрузки) */
const INITIAL_GAME_LOADED_COUNT = 0;

const sectors = generateGalaxy();
const { prices, stock } = initializeStationData(sectors);

// Первый сектор отмечаем посещённым
sectors[0].visited = true;

const initialCrew: CrewMember[] = [
  buildCrewMember({
    id: 1,
    name: "Арктурий Зорин",
    profession: "pilot",
    moduleId: 102,
    level: 3,
  }),
  buildCrewMember({
    id: 2,
    name: "Элиара Вентрис",
    profession: "engineer",
    moduleId: 103,
    level: 1,
    traits: [],
  }),
  buildCrewMember({
    id: 3,
    name: "Элиара Вентрис",
    profession: "medic",
    moduleId: 103,
    level: 1,
  }),
];

/**
 * DEBUG: Технологии, которые будут применены при старте игры.
 * Бонусы применяются корректно (module_health, shield_strength и т.д.).
 */
const DEBUG_RESEARCHED_TECHS: TechnologyId[] = [
  // "reinforced_hull",
  // "efficient_reactor",
  // "targeting_matrix",
  // "ion_cannon",
  // "scanner_mk2",
  // "automated_repair",
  // "medbay_upgrade",
  // "artifact_study",
  // "xenobiology",
  // "ion_drive",
  // "shield_booster",
  // "combat_drones",
  // "plasma_weapons",
  // "lab_network",
  // "quantum_scanner",
  // "cargo_expansion",
  // "crew_training",
  // "relic_chamber",
  // "singularity_reactor",
  // "phase_shield",
  // "storm_shields",
  // "quantum_torpedo",
  // "antimatter_weapons",
  // "neural_interface",
  // "genetic_enhancement",
  // "nanite_hull",
  // "planetary_drill",
  // "deep_scan",
  // "atmospheric_analysis",
  // "ancient_resonance",
  // "void_resonance",
  // "stellar_genetics",
  // "artifact_mastery",
  // "modular_arsenal",
  // "ancient_power",
  // "warp_drive",
  // "cybernetic_augmentation",
  // "expedition_kits",
  // "bio_membrane_shield",
];

/**
 * Начальное состояние игры.
 *
 * Содержит все параметры для старта новой игры:
 * - Ресурсы игрока (кредиты, топливо)
 * - Корабль (модули, груз, характеристики)
 * - Экипаж
 * - Сгенерированную галактику с секторами и станциями
 * - Трекеры прогресса (контракты, квесты, артефакты)
 * - Состояния игры (боевая система, cooldown'ы, эффекты)
 */
const baseState: GameState = {
  turn: INITIAL_TURN,
  credits: INITIAL_CREDITS,
  probes: 1,
  currentSector: sectors[0],
  currentLocation: null,
  gameMode: INITIAL_GAME_MODE,
  previousGameMode: null,
  traveling: null,
  ship: {
    armor: 1,
    shields: 0,
    maxShields: 0,
    crewCapacity: INITIAL_CREW_CAPACITY,
    modules: initialModules,
    gridSize: INITIAL_GRID_SIZE,
    cargo: [],
    tradeGoods: [
      // { item: "electronics", quantity: 10, buyPrice: 0 },
      // { item: "rare_minerals", quantity: 10, buyPrice: 0 },
      // { item: 'spares', quantity: 10, buyPrice: 0 },
    ],
    fuel: STARTING_FUEL,
    maxFuel: STARTING_FUEL,
    mergeTraits: [],
  },
  crew: initialCrew,
  galaxy: { sectors },
  activeContracts: [],
  completedContractIds: [],
  shipQuestsTaken: [],
  completedLocations: [],
  stationInventory: {},
  stationPrices: prices,
  stationStock: stock,
  friendlyShipStock: {},
  currentCombat: null,
  log: [],
  randomEventCooldown: 0,
  hiredCrew: {},
  hiredCrewFromShips: [],
  distressRespondedShips: [],
  artifacts: ANCIENT_ARTIFACTS.map((a) => ({ ...a })),
  knownRaces: [INITIAL_KNOWN_RACE],
  // knownRaces: [
  //     "human",
  //     "crystalline",
  //     "krylorian",
  //     "voidborn",
  //     "xenosymbiont",
  //     "synthetic",
  // ],
  raceReputation: INITIAL_RACE_REPUTATION,
  gameLoadedCount: INITIAL_GAME_LOADED_COUNT,
  battleResult: null,
  stormResult: null,
  gameOver: false,
  gameOverReason: null,
  gameVictory: false,
  gameVictoryReason: null,
  victoryTriggered: false,
  activeEffects: [],
  planetCooldowns: {},
  research: {
    resources: {
      // energy_samples: 20,
      // tech_salvage: 20,
      // rare_minerals: 10,
      // quantum_crystals: 5,
      // ancient_data: 5,
      // alien_biology: 5,
    },
    discoveredTechs: INITIAL_DISCOVERED_TECHS,
    researchedTechs: [],
    activeResearch: null,
    unlockedRecipes: [],
  },
  moduleRecipes: [
    // 'deep_survey_array'
  ],
  pendingSurvivor: null,
  activeExpedition: null,
  activeDive: null,
  settings: {
    animationsEnabled: true,
  },
  galaxyZoom: 1,
  sectorZoom: 1,
  galaxyOffset: { x: 0, y: 0 },
  sectorOffset: { x: 0, y: 0 },
  bannedPlanets: [],
};

/**
 * Финальное начальное состояние.
 * Если DEBUG_RESEARCHED_TECHS не пустой — применяет технологии корректно
 * (включая module_health, shield_strength и другие разовые бонусы).
 */
export const initialState: GameState =
  DEBUG_RESEARCHED_TECHS.length > 0
    ? {
      ...baseState,
      ...applyResearchedTechs(baseState, DEBUG_RESEARCHED_TECHS),
    }
    : baseState;
