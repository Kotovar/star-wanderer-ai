import { store as i18nStore } from "@/lib/useTranslation";
import { getCurrentCargo } from "@/game/slices/ship/helpers/getCurrentCargo";
import { getActiveModule } from "@/game/modules";
import { getCargoCapacity } from "@/game/slices/ship/helpers/getCargoCapacity";
import { playSound } from "@/sounds";
import type {
    GameStore,
    SetState,
    Goods,
    StationPrices,
    StationStock,
} from "@/game/types";
import type { BuyValidation } from "./types";
import { applyReputationPriceModifier } from "@/game/reputation/priceModifier";
import { applyCrisisMarketModifier } from "@/game/stations/crisisMarket";
import {
    getContrabandReputationPenalty,
    getPirateContrabandBuyPrice,
    REPUTATION_BUY_THRESHOLD,
} from "../constants";
import { clampWantedHeat, getContrabandHeat } from "@/game/slices/pirate/wanted";

/**
 * Проверяет возможность покупки товара
 * @param state - Текущее состояние игры
 * @param goodId - ID товара
 * @param quantity - Количество
 * @param stationId - ID станции
 * @param stationPrices - Цены станции
 * @param stationStock - Запасы станции
 * @returns Результат проверки
 */
const validateBuyTradeGood = (
    state: GameStore,
    goodId: Goods,
    quantity: number,
    stationId: string,
    stationPrices: StationPrices,
    stationStock: StationStock,
): BuyValidation => {
    const pricesFromStation = stationPrices[stationId];
    const stockFromStation = stationStock[stationId];

    if (!pricesFromStation || !stockFromStation) {
        return { canBuy: false, error: i18nStore.t("game_logs.err_no_trade") };
    }

    // Применяем модификатор репутации если есть доминирующая раса
    const raceId = state.currentLocation?.dominantRace;
    const isPirate = state.currentLocation?.stationConfig?.isPirate ?? false;

    // Контрабанду покупают только на чёрном рынке — как и продают её только там
    if (goodId === "contraband" && !isPirate) {
        return {
            canBuy: false,
            error: i18nStore.t("game_logs.err_contraband_pirate_only"),
        };
    }

    // Кризисный множитель применяется к обеим ценам — арбитраж невозможен
    const crisisPrices = applyCrisisMarketModifier(
        pricesFromStation[goodId],
        state.activeCrisis?.id,
        goodId,
    );
    const pricePer5 =
        isPirate && goodId === "contraband"
            ? getPirateContrabandBuyPrice(crisisPrices.buy, crisisPrices.sell)
            : crisisPrices.buy;
    const sellPrice = crisisPrices.sell;
    let price: number;
    if (raceId && !isPirate) {
        price = applyReputationPriceModifier(
            state.raceReputation,
            raceId,
            pricePer5,
            "buy",
            sellPrice, // Anti-arbitrage: ensure buy > sell
            quantity,
        );
    } else {
        price = Math.floor(pricePer5 * (quantity / 5));
    }

    const available = stockFromStation[goodId] || 0;

    if (available < quantity) {
        return { canBuy: false, error: i18nStore.t("game_logs.err_station_no_stock") };
    }

    if (state.credits < price) {
        return { canBuy: false, error: i18nStore.t("game_logs.err_no_credits") };
    }

    // Проверка грузового модуля
    const cargoModule = getActiveModule(state.ship.modules, "cargo");

    if (!cargoModule) {
        return { canBuy: false, error: i18nStore.t("game_logs.err_cargo_off") };
    }

    // Проверка места в грузовом отсеке
    const currentCargo = getCurrentCargo(state);

    const cargoCapacity = getCargoCapacity(state);

    if (currentCargo + quantity > cargoCapacity) {
        return { canBuy: false, error: i18nStore.t("game_logs.err_no_space") };
    }

    return { canBuy: true, price: Math.floor(price) };
};

/**
 * Покупка торгового товара
 * @param set - Функция обновления состояния
 * @param get - Функция получения состояния
 * @param goodId - ID товара
 * @param quantity - Количество
 */
export const buyTradeGood = (
    set: SetState,
    get: () => GameStore,
    goodId: Goods,
    quantity: number = 5,
): void => {
    const state = get();
    const stationId = state.currentLocation?.stationId;
    const isPirate = state.currentLocation?.stationConfig?.isPirate ?? false;

    if (!stationId) {
        get().addLog( i18nStore.t("game_logs.buyTradeGood_1"), "error");
        return;
    }

    const validation = validateBuyTradeGood(
        state,
        goodId,
        quantity,
        stationId,
        state.stationPrices,
        state.stationStock,
    );

    if (!validation.canBuy) {
        if (validation.error) {
            get().addLog(validation.error, "error");
        }
        return;
    }

    const prices = state.stationPrices[stationId][goodId];
    const pricePer5 =
        isPirate && goodId === "contraband"
            ? getPirateContrabandBuyPrice(prices.buy, prices.sell)
            : prices.buy;

    // Обновление товаров
    set((s) => {
        const existingGood = s.ship.tradeGoods.find((g) => g.item === goodId);
        if (existingGood) {
            // Себестоимость — средневзвешенная по стаку: раньше она застревала
            // на цене самой первой покупки.
            const totalQuantity = existingGood.quantity + quantity;
            const averageBuyPrice = Math.round(
                ((existingGood.buyPrice ?? pricePer5) * existingGood.quantity +
                    pricePer5 * quantity) /
                    totalQuantity,
            );
            return {
                ship: {
                    ...s.ship,
                    tradeGoods: s.ship.tradeGoods.map((g) =>
                        g.item === goodId
                            ? {
                                  ...g,
                                  quantity: totalQuantity,
                                  buyPrice: averageBuyPrice,
                              }
                            : g,
                    ),
                },
            };
        } else {
            return {
                ship: {
                    ...s.ship,
                    tradeGoods: [
                        ...s.ship.tradeGoods,
                        { item: goodId, quantity, buyPrice: pricePer5 },
                    ],
                },
            };
        }
    });

    // Обновление кредитов и запасов станции
    set((s) => ({
        credits: s.credits - (validation.price ?? 0),
        stationStock: {
            ...s.stationStock,
            [stationId]: {
                ...s.stationStock[stationId],
                [goodId]: (s.stationStock[stationId]?.[goodId] || 0) - quantity,
            },
        },
    }));

    const dominantRace = state.currentLocation?.dominantRace;

    // Пиратские станции не дают репутации за торговлю, но контрабанда оставляет след.
    if (isPirate) {
        if (goodId === "contraband") {
            const penalty = getContrabandReputationPenalty(quantity);
            if (dominantRace) {
                get().changeReputation(dominantRace, -penalty);
                get().addLog(
                    i18nStore.t("pirate.contraband_bought_reputation", {
                        race: i18nStore.t(`races.${dominantRace}.plural`),
                        penalty,
                    }),
                    "warning",
                );
            }
            const heat = getContrabandHeat(quantity);
            set((s) => ({
                wantedHeat: clampWantedHeat((s.wantedHeat ?? 0) + heat),
            }));
            get().addLog(
                i18nStore.t("pirate.heat_trade", { amount: heat }),
                "warning",
            );
        }
    } else if (dominantRace && quantity >= REPUTATION_BUY_THRESHOLD) {
        // Повышение репутации с расой за крупную торговлю (+1 за 20+ единиц)
        const reputationGain = Math.floor(quantity / REPUTATION_BUY_THRESHOLD);
        get().changeReputation(dominantRace, reputationGain);
    }

    get().addLog( i18nStore.t("game_logs.buyTradeGood_2", { name: i18nStore.t(`trade.goods.${goodId}`), quantity, price: validation.price ?? 0 }),
        "info",
    );
    playSound("ui_purchase");
};
