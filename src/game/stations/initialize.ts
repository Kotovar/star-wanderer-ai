import { typedKeys } from "@/lib/utils";
import type { Sector } from "@/game/types";
import { TRADE_GOODS } from "@/game/constants/goods";

type Stock = Record<string, Record<string, number>>;
type Prices = Record<string, Record<string, { buy: number; sell: number }>>;

/** Базовый множитель цены для расчёта цены покупки */
const BASE_BUY_PRICE_MULTIPLIER = 1.6;

/** Минимальный множитель вариации цены */
const MIN_PRICE_VARIATION = 0.7;

/** Максимальный множитель вариации цены */
const MAX_PRICE_VARIATION = 0.6;

/** Минимальное количество товара на складе */
const MIN_STOCK_AMOUNT = 20;

/** Максимальное случайное дополнение к складу */
const MAX_STOCK_VARIATION = 30;

/** Значение скидки по умолчанию (без скидки) */
const DEFAULT_DISCOUNT = 1;

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
    const prices: Prices = {};
    const stock: Stock = {};

    sectors.forEach((sector) => {
        sector.locations.forEach((loc) => {
            if (loc.type === "station" && loc.stationId) {
                prices[loc.stationId] = {};
                stock[loc.stationId] = {};

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
