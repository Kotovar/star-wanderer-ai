import { TRADE_GOODS } from "@/game/constants/goods";
import { STOCK_RANGE } from "@/game/slices/trade/constants";
import type { GameStore, SetState } from "@/game/types";
import {
    driftStationPrices,
    restockStations,
    PRICE_DRIFT_INTERVAL,
    RESTOCK_INTERVAL,
    type BasePrices,
} from "./marketTick";

const BASE_PRICES: BasePrices = Object.fromEntries(
    Object.entries(TRADE_GOODS).map(([id, good]) => [id, good.basePrice]),
);

/** Целевой уровень склада — середина стартового диапазона */
const RESTOCK_TARGET = Math.round((STOCK_RANGE.min + STOCK_RANGE.max) / 2);

/**
 * Тик рынка: вызывается каждый ход из nextTurn.
 * Раз в PRICE_DRIFT_INTERVAL ходов дрейфуют цены,
 * раз в RESTOCK_INTERVAL ходов пополняются склады.
 */
export const processMarketTick = (
    set: SetState,
    get: () => GameStore,
): void => {
    const turn = get().turn;

    if (turn > 0 && turn % PRICE_DRIFT_INTERVAL === 0) {
        set((s) => ({
            stationPrices: driftStationPrices(s.stationPrices, BASE_PRICES),
        }));
    }

    if (turn > 0 && turn % RESTOCK_INTERVAL === 0) {
        set((s) => ({
            stationStock: restockStations(s.stationStock, RESTOCK_TARGET),
        }));
    }
};
