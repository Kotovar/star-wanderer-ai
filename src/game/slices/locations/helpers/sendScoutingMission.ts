import type {
    SetState,
    GameStore,
    Location,
    ScoutingOutcome,
} from "@/game/types";
import { TRADE_GOODS } from "@/game/constants";
import {
    SCOUT_BASE_EXP,
    SCOUTING_TRADE_GOOD_QUANTITY,
    SCOUTING_REQUIRED_VISITS,
} from "../constants";
import { determineScoutingOutcome } from "./determineScoutingOutcome";
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

    // Find scout
    const scout = state.crew.find((c) => c.profession === "scout");
    if (!scout) {
        get().addLog("Нет разведчика!", "error");
        return;
    }

    // Instant scouting - resolve immediately (takes 1 turn)
    const outcome = Math.random();
    const result = determineScoutingOutcome(outcome);

    // Give experience to scout
    get().gainExp(scout, SCOUT_BASE_EXP);

    // Apply scouting result
    applyScoutingResult(result, set, get);

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
            applyTradeGoodReward(result.itemName, scoutName, set, get);
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
 */
const applyTradeGoodReward = (
    itemName: string | undefined,
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
            tradeGoods: [
                ...s.ship.tradeGoods,
                {
                    item: goodId,
                    quantity: SCOUTING_TRADE_GOOD_QUANTITY,
                    buyPrice: 0,
                },
            ],
        },
    }));
    get().addLog(`Разведка: ${scoutName} нашёл ${itemName}!`, "info");
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
