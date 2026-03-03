import { ANCIENT_ARTIFACTS } from "@/game/constants/artifacts";
import { initialCrew } from "@/game/crew/initial";
import { generateGalaxy } from "@/game/galaxy/generateGalaxy";
import { initialModules, STARTING_FUEL } from "@/game/modules/initial";
import { initializeStationData } from "@/game/stations/initialize";
import type { GameState } from "@/game/types/game";

/** Начальный номер хода */
const INITIAL_TURN = 1;

/** Начальное количество кредитов игрока */
const INITIAL_CREDITS = 100000;

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

const sectors = generateGalaxy();
const { prices, stock } = initializeStationData(sectors);

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
        armor: initialModules.length,
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
    scoutingMissions: [],
    hiredCrew: {},
    hiredCrewFromShips: [],
    artifacts: ANCIENT_ARTIFACTS.map((a) => ({ ...a })),
    knownRaces: [INITIAL_KNOWN_RACE],
    battleResult: null,
    gameOver: false,
    gameOverReason: null,
    gameVictory: false,
    gameVictoryReason: null,
    activeEffects: [],
    planetCooldowns: {},
    research: {
        resources: {},
        discoveredTechs: [
            "reinforced_hull",
            "efficient_reactor",
            "targeting_matrix",
            "scanner_mk2",
            "automated_repair",
            "medbay_upgrade",
        ],
        researchedTechs: [],
        activeResearch: null,
    },
};
