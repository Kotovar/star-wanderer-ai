import { typedKeys } from "@/lib/utils";
import { TRADE_GOODS } from "@/game/constants/goods";
import {
    BASE_BUY_PRICE_MULTIPLIER,
    MIN_PRICE_VARIATION,
    MAX_PRICE_VARIATION,
    MIN_STOCK_AMOUNT,
    MAX_STOCK_VARIATION,
    DEFAULT_DISCOUNT,
} from "@/game/slices/trade/constants";
import type { Sector, Goods, StationPrices, StationStock } from "@/game/types";

/**
 * Инициализирует данные для всех станций в секторах.
 *
 * Генерирует начальные цены и запасы товаров для каждой станции.
 * Цены рассчитываются на основе базовой цены товара с учётом случайной
 * вариации и скидок станции (для минералов и редких минералов на шахтёрских станциях).
 *
 * @param sectors - Массив секторов, содержащих станции для инициализации
 * @returns Объект с ценами и запасами товаров для каждой станции
 */
export const initializeStationData = (sectors: Sector[]) => {
    const prices: StationPrices = {};
    const stock: StationStock = {};

    sectors.forEach((sector) => {
        sector.locations.forEach((loc) => {
            if (loc.type === "station" && loc.stationId) {
                prices[loc.stationId] = {} as Record<
                    Goods,
                    { buy: number; sell: number }
                >;
                stock[loc.stationId] = {} as Record<Goods, number>;

                const stationConfig = loc.stationConfig;
                const mineralDiscount =
                    stationConfig?.mineralDiscount ?? DEFAULT_DISCOUNT;
                const rareMineralDiscount =
                    stationConfig?.rareMineralDiscount ?? DEFAULT_DISCOUNT;
                const priceDiscount =
                    stationConfig?.priceDiscount ?? DEFAULT_DISCOUNT;

                for (const goodId of typedKeys(TRADE_GOODS)) {
                    const good = TRADE_GOODS[goodId];

                    const priceVar =
                        MIN_PRICE_VARIATION +
                        Math.random() * MAX_PRICE_VARIATION;
                    const sellPrice = Math.floor(
                        good.basePrice * priceVar * priceDiscount,
                    );

                    let buyPrice = Math.floor(
                        sellPrice * BASE_BUY_PRICE_MULTIPLIER,
                    );

                    if (goodId === "minerals") {
                        buyPrice = Math.floor(buyPrice * mineralDiscount);
                    } else if (goodId === "rare_minerals") {
                        buyPrice = Math.floor(buyPrice * rareMineralDiscount);
                    }

                    prices[loc.stationId][goodId] = {
                        buy: buyPrice,
                        sell: sellPrice,
                    };
                    stock[loc.stationId][goodId] =
                        MIN_STOCK_AMOUNT +
                        Math.floor(Math.random() * MAX_STOCK_VARIATION);
                }
            }
        });
    });

    return { prices, stock };
};
