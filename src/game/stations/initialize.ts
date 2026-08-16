import { typedKeys } from "@/lib/utils";
import { TRADE_GOODS } from "@/game/constants/goods";
import {
    BASE_BUY_PRICE_MULTIPLIER,
    MIN_PRICE_VARIATION,
    MAX_PRICE_VARIATION,
    MIN_STOCK_AMOUNT,
    MAX_STOCK_VARIATION,
    DEFAULT_DISCOUNT,
    getTierPriceMultiplier,
} from "@/game/slices/trade/constants";
import type { Sector, Goods, StationPrices, StationStock } from "@/game/types";

/**
 * Инициализирует данные для всех станций в секторах.
 *
 * Генерирует начальные цены и запасы товаров для каждой станции.
 * Цены рассчитываются на основе базовой цены товара с учётом случайной
 * вариации, priceDiscount станции, скидки торговых станций на покупку
 * минералов/редких минералов (mineralDiscount/rareMineralDiscount) и надбавки
 * шахтёрских станций к цене продажи минералов игроком (mineralSellBonus/rareMineralSellBonus).
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

                // Цены растут с тиром сектора: дальние станции торгуют дороже
                const tierMultiplier = getTierPriceMultiplier(sector.tier);
                const stationConfig = loc.stationConfig;
                const isPirate = stationConfig?.isPirate ?? false;
                const mineralDiscount =
                    stationConfig?.mineralDiscount ?? DEFAULT_DISCOUNT;
                const rareMineralDiscount =
                    stationConfig?.rareMineralDiscount ?? DEFAULT_DISCOUNT;
                const mineralSellBonus =
                    stationConfig?.mineralSellBonus ?? DEFAULT_DISCOUNT;
                const rareMineralSellBonus =
                    stationConfig?.rareMineralSellBonus ?? DEFAULT_DISCOUNT;
                const priceDiscount =
                    stationConfig?.priceDiscount ?? DEFAULT_DISCOUNT;

                for (const goodId of typedKeys(TRADE_GOODS)) {
                    const good = TRADE_GOODS[goodId];

                    const priceVar =
                        MIN_PRICE_VARIATION +
                        Math.random() * MAX_PRICE_VARIATION;
                    const baseSellPrice = Math.floor(
                        good.basePrice *
                            tierMultiplier *
                            priceVar *
                            priceDiscount,
                    );

                    let buyPrice = Math.floor(
                        baseSellPrice * BASE_BUY_PRICE_MULTIPLIER,
                    );

                    // Торговые станции продают минералы/редкие минералы игроку
                    // дешевле (mineralDiscount/rareMineralDiscount)
                    if (goodId === "minerals") {
                        buyPrice = Math.floor(buyPrice * mineralDiscount);
                    } else if (goodId === "rare_minerals") {
                        buyPrice = Math.floor(buyPrice * rareMineralDiscount);
                    }

                    // Шахтёрские станции платят больше за сырую руду, сданную игроком
                    // (mineralSellBonus/rareMineralSellBonus) — считается от baseSellPrice,
                    // buyPrice (цена покупки игроком) при этом не растёт.
                    let sellPrice = baseSellPrice;
                    if (goodId === "minerals") {
                        sellPrice = Math.floor(
                            baseSellPrice * mineralSellBonus,
                        );
                    } else if (goodId === "rare_minerals") {
                        sellPrice = Math.floor(
                            baseSellPrice * rareMineralSellBonus,
                        );
                    }

                    prices[loc.stationId][goodId] = {
                        buy: buyPrice,
                        sell: sellPrice,
                    };

                    let stockAmount =
                        MIN_STOCK_AMOUNT +
                        Math.floor(Math.random() * MAX_STOCK_VARIATION);

                    // Pirate stations carry very little contraband in "official" stock
                    if (isPirate && goodId === "contraband") {
                        stockAmount = 5 + Math.floor(Math.random() * 11);
                    }

                    // Contraband is only openly traded at pirate stations
                    if (!isPirate && goodId === "contraband") {
                        stockAmount = 0;
                    }

                    stock[loc.stationId][goodId] = stockAmount;
                }
            }
        });
    });

    return { prices, stock };
};
