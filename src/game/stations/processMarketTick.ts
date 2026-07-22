import { TRADE_GOODS } from "@/game/constants/goods";
import {
    STOCK_RANGE,
    getTierPriceMultiplier,
} from "@/game/slices/trade/constants";
import type { GameStore, SetState } from "@/game/types";
import {
    driftStationPrices,
    restockStations,
    PRICE_DRIFT_INTERVAL,
    RESTOCK_INTERVAL,
    type BasePrices,
    type StationTierMultipliers,
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
        // Коридор дрейфа учитывает тир сектора станции
        const tierMultipliers: StationTierMultipliers = {};
        for (const sector of get().galaxy.sectors) {
            for (const loc of sector.locations) {
                if (loc.type === "station" && loc.stationId) {
                    tierMultipliers[loc.stationId] = getTierPriceMultiplier(
                        sector.tier,
                    );
                }
            }
        }
        set((s) => ({
            stationPrices: driftStationPrices(
                s.stationPrices,
                BASE_PRICES,
                Math.random,
                tierMultipliers,
            ),
        }));
    }

    if (turn > 0 && turn % RESTOCK_INTERVAL === 0) {
        set((s) => ({
            stationStock: restockStations(s.stationStock, RESTOCK_TARGET),
        }));
    }
};
