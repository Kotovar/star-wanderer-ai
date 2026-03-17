import { ANCIENT_ARTIFACTS } from "@/game/constants/artifacts";
import { generateGalaxy } from "@/game/galaxy/generateGalaxy";
import { initialModules, STARTING_FUEL } from "@/game/modules/initial";
import { initializeStationData } from "@/game/stations/initialize";
import type { GameState, CrewMember, TechnologyId } from "@/game/types";
import { buildCrewMember } from "@/game/crew/buildCrewMember";
// import { RESEARCH_TREE } from "../constants";

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

/** Начальные технологии */
const INITIAL_DISCOVERED_TECHS: TechnologyId[] = [
    "reinforced_hull",
    "efficient_reactor",
    "targeting_matrix",
    "scanner_mk2",
    "automated_repair",
    "medbay_upgrade",
    "artifact_study",
];

/** Счётчик загрузок игры (для предотвращения показа модалок после загрузки) */
const INITIAL_GAME_LOADED_COUNT = 0;

const sectors = generateGalaxy();
const { prices, stock } = initializeStationData(sectors);

// Mark the starting sector (sectors[0]) as visited
sectors[0].visited = true;

const initialCrew: CrewMember[] = [
    buildCrewMember({
        id: 1,
        name: "Иванов",
        profession: "pilot",
        moduleId: 102,
    }),
    buildCrewMember({
        id: 2,
        name: "Петрова",
        profession: "engineer",
        moduleId: 103,
    }),
    buildCrewMember({
        id: 3,
        name: "Сидоров",
        profession: "medic",
        moduleId: 103,
    }),
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
export const initialState: GameState = {
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
        // DEBUG: открываем все технологии для отладки
        // discoveredTechs: Object.keys(RESEARCH_TREE),
        discoveredTechs: INITIAL_DISCOVERED_TECHS,
        // DEBUG: делаем все технологии изученными
        // researchedTechs: Object.keys(RESEARCH_TREE),
        // researchedTechs: ["relic_chamber"],
        researchedTechs: [],
        activeResearch: null,
        // DEBUG: разблокируем все рецепты крафтинга
        unlockedRecipes: [],
        // unlockedRecipes: ["plasma", "drones", "antimatter", "quantum_torpedo"],
    },
    pendingSurvivor: null,
    settings: {
        animationsEnabled: true,
    },
};
