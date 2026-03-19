import type {
    SetState,
    GameStore,
    Location,
    ScoutingOutcome,
    ResearchResourceType,
} from "@/game/types";
import { TRADE_GOODS, MUTATION_CHANCES, RESEARCH_RESOURCES } from "@/game/constants";
import {
    SCOUTING_TRADE_GOOD_BASE_MIN,
    SCOUTING_TRADE_GOOD_BASE_MAX,
    SCOUTING_REQUIRED_VISITS,
} from "../constants";
import { SCOUT_BASE_EXP } from "@/game/constants/experience";
import { addTradeGood } from "@/game/slices/ship/helpers";
import { determineScoutingOutcome } from "./determineScoutingOutcome";
import { giveRandomMutation } from "@/game/crew";
import { getScoutingPlanetResources } from "@/game/research/utils";
import { typedKeys } from "@/lib";

/**
 * Отправляет разведчика на исследование планеты
 *
 * @param planetId - ID планеты для разведки
 * @param set - Функция обновления состояния
 * @param get - Функция получения состояния
 */
export const sendScoutingMission = (
    planetId: string,
    set: SetState,
    get: () => GameStore,
): void => {
    const state = get();

    // Find the highest-level scout
    const scouts = state.crew.filter((c) => c.profession === "scout");
    if (scouts.length === 0) {
        get().addLog("Нет разведчика!", "error");
        return;
    }
    const scout = scouts.reduce((best, c) =>
        (c.level ?? 1) > (best.level ?? 1) ? c : best,
    );

    // Instant scouting - resolve immediately (takes 1 turn)
    const outcome = Math.random();
    const result = determineScoutingOutcome(outcome);

    // Pre-compute trade good quantity so it's available for both apply and lastScoutResult
    if (result.type === "tradeGood") {
        result.quantity =
            Math.floor(
                Math.random() *
                    (SCOUTING_TRADE_GOOD_BASE_MAX - SCOUTING_TRADE_GOOD_BASE_MIN + 1),
            ) +
            SCOUTING_TRADE_GOOD_BASE_MIN +
            (scout.level ?? 1);
    }

    // Give experience to scout
    get().gainExp(scout, SCOUT_BASE_EXP);

    // Apply scouting result
    applyScoutingResult(result, set, get);

    // Small chance to find research resources
    const foundResources = applyScoutingResources(set, get);
    if (foundResources.length > 0) {
        result.researchResources = foundResources;
    }

    // Шанс заражения чужеродными организмами при разведке
    if (Math.random() < MUTATION_CHANCES.SCOUT_INFECTION) {
        const mutationName = giveRandomMutation(scout, set);
        if (mutationName) {
            result.mutationName = mutationName;
            get().addLog(
                `☣️ ${scout.name} заразился чужеродными организмами при разведке: ${mutationName}!`,
                "error",
            );
        }
    }

    // Update exploration progress
    const newScoutedTimes = getScoutedTimes(state, planetId) + 1;
    const isFullyExplored = newScoutedTimes >= SCOUTING_REQUIRED_VISITS;

    // Update state
    updateScoutingState(
        planetId,
        newScoutedTimes,
        isFullyExplored,
        result,
        set,
    );

    get().addLog(
        `Разведка завершена: ${newScoutedTimes}/${SCOUTING_REQUIRED_VISITS}`,
        "info",
    );
    get().updateShipStats();
};

/**
 * Применяет результат разведки (кредиты или товар)
 */
const applyScoutingResult = (
    result: ScoutingOutcome,
    set: SetState,
    get: () => GameStore,
): void => {
    const scout = get().crew.find((c) => c.profession === "scout");
    const scoutName = scout?.name || "Разведчик";

    switch (result.type) {
        case "credits":
            applyCreditReward(result.value, scoutName, set, get);
            break;
        case "tradeGood":
            applyTradeGoodReward(result.itemName, result.quantity ?? 1, scoutName, set, get);
            break;
        default:
            get().addLog(`Разведка: ${scoutName} ничего не нашёл`, "info");
    }
};

/**
 * Применяет награду в кредитах
 */
const applyCreditReward = (
    value: number | undefined,
    scoutName: string,
    set: SetState,
    get: () => GameStore,
): void => {
    if (value === undefined) return;

    set((s) => ({ credits: s.credits + value }));
    get().addLog(`Разведка: ${scoutName} нашёл ресурсы! +${value}₢`, "info");
};

/**
 * Применяет награду в виде товара
 * Количество: 1–3 + уровень разведчика (вычислено заранее)
 */
const applyTradeGoodReward = (
    itemName: string | undefined,
    quantity: number,
    scoutName: string,
    set: SetState,
    get: () => GameStore,
): void => {
    if (!itemName) return;

    const keys = typedKeys(TRADE_GOODS);
    const goodId = keys.find((key) => TRADE_GOODS[key].name === itemName);

    if (!goodId) return;

    set((s) => ({
        ship: {
            ...s.ship,
            tradeGoods: addTradeGood(s.ship.tradeGoods, goodId, quantity),
        },
    }));
    get().addLog(`Разведка: ${scoutName} нашёл ${itemName} x${quantity}!`, "info");
};

/**
 * Применяет научные ресурсы, найденные при разведке планеты
 */
const applyScoutingResources = (
    set: SetState,
    get: () => GameStore,
): { type: ResearchResourceType; quantity: number }[] => {
    const resources = getScoutingPlanetResources();
    if (resources.length === 0) return [];

    set((s) => ({
        research: {
            ...s.research,
            resources: {
                ...s.research.resources,
                ...resources.reduce(
                    (acc, res) => ({
                        ...acc,
                        [res.type]: (s.research.resources[res.type] || 0) + res.quantity,
                    }),
                    {},
                ),
            },
        },
    }));

    resources.forEach((res) => {
        const resourceData = RESEARCH_RESOURCES[res.type];
        get().addLog(
            `🔬 Разведка: обнаружены образцы ${resourceData.icon} ${resourceData.name} x${res.quantity}`,
            "info",
        );
    });

    return resources;
};

/**
 * Получает текущее количество попыток разведки планеты
 */
const getScoutedTimes = (state: GameStore, planetId: string) =>
    state.currentSector?.locations.find((l) => l.id === planetId)
        ?.scoutedTimes || 0;

/**
 * Создаёт объект результата разведки
 */
const createScoutResult = (result: ScoutingOutcome): ScoutingOutcome => ({
    type: result.type,
    value: result.type === "credits" ? result.value : undefined,
    itemName: result.type === "tradeGood" ? result.itemName : undefined,
    quantity: result.type === "tradeGood" ? result.quantity : undefined,
    mutationName: result.mutationName,
    researchResources: result.researchResources,
});

/**
 * Обновляет состояние игры после разведки
 */
const updateScoutingState = (
    planetId: string,
    newScoutedTimes: number,
    isFullyExplored: boolean,
    result: ScoutingOutcome,
    set: SetState,
): void => {
    const scoutResult = createScoutResult(result);

    set((s) => ({
        turn: s.turn + 1,
        currentSector: updateSectorLocations(
            s.currentSector,
            planetId,
            newScoutedTimes,
            isFullyExplored,
            scoutResult,
        ),
        currentLocation: updateCurrentLocation(
            s.currentLocation,
            planetId,
            newScoutedTimes,
            isFullyExplored,
            scoutResult,
        ),
    }));
};

/**
 * Обновляет локации в секторе
 */
const updateSectorLocations = (
    sector: GameStore["currentSector"],
    planetId: string,
    scoutedTimes: number,
    explored: boolean,
    scoutResult: NonNullable<Location["lastScoutResult"]>,
): GameStore["currentSector"] => {
    if (!sector) return null;

    return {
        ...sector,
        locations: sector.locations.map((loc) =>
            loc.id === planetId
                ? {
                      ...loc,
                      scoutedTimes,
                      explored,
                      lastScoutResult: scoutResult,
                  }
                : loc,
        ),
    };
};

/**
 * Обновляет текущую локацию
 */
const updateCurrentLocation = (
    location: Location | null,
    planetId: string,
    scoutedTimes: number,
    explored: boolean,
    scoutResult: NonNullable<Location["lastScoutResult"]>,
): GameStore["currentLocation"] => {
    if (location?.id !== planetId) return location;

    return {
        ...location,
        scoutedTimes,
        explored,
        lastScoutResult: scoutResult,
    };
};
