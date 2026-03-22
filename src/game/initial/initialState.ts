import { ANCIENT_ARTIFACTS } from "@/game/constants/artifacts";
import { RESEARCH_TREE } from "@/game/constants";
import { generateGalaxy } from "@/game/galaxy/generateGalaxy";
import { initialModules, STARTING_FUEL } from "@/game/modules/initial";
import { initializeStationData } from "@/game/stations/initialize";
import type { GameState, CrewMember, TechnologyId } from "@/game/types";
import { buildCrewMember } from "@/game/crew/buildCrewMember";
import { applyResearchedTechs } from "@/game/research/applyResearchedTechs";

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
        name: "Иванов",
        profession: "pilot",
        moduleId: 102,
        level: 1,
    }),
    buildCrewMember({
        id: 2,
        name: "Петрова",
        profession: "engineer",
        moduleId: 103,
        level: 1,
        traits: [],
    }),
    buildCrewMember({
        id: 3,
        name: "Сидоров",
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
    // "shield_booster",
    // "phase_shield",
    // "singularity_reactor",
    // "ion_drive",
    // "plasma_weapons",
    // "combat_drones",
    // "quantum_torpedo",
    // "antimatter_weapons",
    // "void_resonance",
    // "ancient_power",
    // "warp_drive",
    // "nanite_hull",
    // "medbay_upgrade",
    // "automated_repair",
    // "cargo_expansion",
    // "lab_network",
    // "xenobiology",
    // "crew_training",
    // "neural_interface",
    // "genetic_enhancement",
    // "stellar_genetics",
    // "scanner_mk2",
    // "quantum_scanner",
    // "deep_scan",
    // "artifact_study",
    // "relic_chamber",
    // "ancient_resonance",
    // "artifact_mastery",
    // "planetary_drill",
    // "atmospheric_analysis",
    // "storm_shields",
    // "modular_arsenal",
    // "ion_cannon",
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
    currentSector: sectors[0],
    currentLocation: null,
    gameMode: INITIAL_GAME_MODE,
    previousGameMode: null,
    traveling: null,
    ship: {
        armor: 1, // Average defense: all starting modules have defense: 1
        shields: 0,
        maxShields: 0,
        crewCapacity: INITIAL_CREW_CAPACITY,
        modules: initialModules,
        gridSize: INITIAL_GRID_SIZE,
        cargo: [],
        tradeGoods: [],
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
    artifacts: ANCIENT_ARTIFACTS.map((a) => ({ ...a })),
    knownRaces: [INITIAL_KNOWN_RACE],
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
        // DEBUG: ресурсы для тестирования крафтинга
        resources: {},
        // resources: {
        //     energy_samples: 20,
        //     tech_salvage: 20,
        //     rare_minerals: 10,
        //     quantum_crystals: 5,
        //     ancient_data: 5,
        //     alien_biology: 5,
        // },
        discoveredTechs: INITIAL_DISCOVERED_TECHS,
        researchedTechs: [],
        activeResearch: null,
        unlockedRecipes: [],
    },
    pendingSurvivor: null,
    settings: {
        animationsEnabled: true,
    },
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
