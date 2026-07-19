// Без runtime-импортов: файл покрыт scripts/check-market-tick.mjs,
// который запускается через node --experimental-strip-types.
import type { StationPrices, StationStock } from "@/game/types";

/** Период дрейфа цен (в ходах) */
export const PRICE_DRIFT_INTERVAL = 5;

/** Период пополнения складов (в ходах) */
export const RESTOCK_INTERVAL = 10;

/** Максимальный сдвиг цены за тик (±15%) */
export const MAX_PRICE_DRIFT = 0.15;

/** Нижняя граница цены продажи относительно базовой цены товара */
export const PRICE_FLOOR_MULTIPLIER = 0.5;

/** Верхняя граница цены продажи относительно базовой цены товара */
export const PRICE_CEIL_MULTIPLIER = 2;

/** Доля недостающего товара, восполняемая за один тик */
export const RESTOCK_RATE = 0.25;

/** Базовые цены товаров: goodId -> basePrice */
export type BasePrices = Record<string, number>;

/**
 * Дрейф цен всех станций: каждая цена смещается на случайный множитель
 * в пределах ±MAX_PRICE_DRIFT. Цена продажи зажимается в коридор
 * [basePrice × PRICE_FLOOR, basePrice × PRICE_CEIL], цена покупки двигается
 * тем же фактическим множителем — соотношение buy > sell (анти-арбитраж)
 * и станционные скидки сохраняются.
 *
 * @param prices - Текущие цены станций
 * @param basePrices - Базовые цены товаров (для коридора)
 * @param random - Источник случайности (подменяется в тестах)
 * @returns Новые цены станций
 */
export const driftStationPrices = (
    prices: StationPrices,
    basePrices: BasePrices,
    random: () => number = Math.random,
): StationPrices => {
    const next: StationPrices = {};

    for (const stationId of Object.keys(prices)) {
        const stationPrices = prices[stationId];
        next[stationId] = { ...stationPrices };

        for (const goodId of Object.keys(stationPrices)) {
            const current = stationPrices[goodId as keyof typeof stationPrices];
            const basePrice = basePrices[goodId];
            if (!current || !basePrice) continue;

            const drift = 1 + (random() * 2 - 1) * MAX_PRICE_DRIFT;

            const minSell = Math.floor(basePrice * PRICE_FLOOR_MULTIPLIER);
            const maxSell = Math.floor(basePrice * PRICE_CEIL_MULTIPLIER);
            const sell = Math.min(
                maxSell,
                Math.max(minSell, Math.floor(current.sell * drift)),
            );

            // Двигаем buy тем же фактическим множителем, что и sell
            const actualDrift = current.sell > 0 ? sell / current.sell : 1;
            const buy = Math.max(
                sell + 1,
                Math.floor(current.buy * actualDrift),
            );

            next[stationId][goodId as keyof typeof stationPrices] = {
                buy,
                sell,
            };
        }
    }

    return next;
};

/**
 * Пополнение складов станций: сток каждого товара подтягивается
 * к целевому уровню на RESTOCK_RATE недостающего за тик (минимум +1).
 * Сток выше целевого уровня не трогается.
 *
 * @param stock - Текущие запасы станций
 * @param target - Целевой уровень склада
 * @returns Новые запасы станций
 */
export const restockStations = (
    stock: StationStock,
    target: number,
): StationStock => {
    const next: StationStock = {};

    for (const stationId of Object.keys(stock)) {
        const stationStock = stock[stationId];
        next[stationId] = { ...stationStock };

        for (const goodId of Object.keys(stationStock)) {
            const current =
                stationStock[goodId as keyof typeof stationStock] ?? 0;
            const deficit = target - current;
            if (deficit <= 0) continue;

            next[stationId][goodId as keyof typeof stationStock] =
                current + Math.max(1, Math.floor(deficit * RESTOCK_RATE));
        }
    }

    return next;
};
