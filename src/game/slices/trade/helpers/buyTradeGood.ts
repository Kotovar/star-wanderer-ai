import { TRADE_GOODS } from "@/game/constants";
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
import { REPUTATION_BUY_THRESHOLD } from "../constants";

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
        return { canBuy: false, error: "Недоступно для торговли" };
    }

    const pricePer5 = pricesFromStation[goodId].buy;

    // Применяем модификатор репутации если есть доминирующая раса
    const raceId = state.currentLocation?.dominantRace;
    const sellPrice = pricesFromStation[goodId].sell;
    let price: number;
    if (raceId) {
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
        return { canBuy: false, error: "Недостаточно товара на станции!" };
    }

    if (state.credits < price) {
        return { canBuy: false, error: "Недостаточно кредитов!" };
    }

    // Проверка грузового модуля
    const cargoModule = getActiveModule(state.ship.modules, "cargo");

    if (!cargoModule) {
        return { canBuy: false, error: "Склад отключен или отсутствует!" };
    }

    // Проверка места в грузовом отсеке
    const currentCargo =
        state.ship.cargo.reduce((s, c) => s + c.quantity, 0) +
        state.ship.tradeGoods.reduce((s, g) => s + g.quantity, 0);

    const cargoCapacity = getCargoCapacity(state);

    if (currentCargo + quantity > cargoCapacity) {
        return { canBuy: false, error: "Недостаточно места!" };
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

    if (!stationId) {
        get().addLog("Не на станции!", "error");
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

    const pricePer5 = state.stationPrices[stationId][goodId].buy;

    // Обновление товаров
    set((s) => {
        const existingGood = s.ship.tradeGoods.find((g) => g.item === goodId);
        if (existingGood) {
            return {
                ship: {
                    ...s.ship,
                    tradeGoods: s.ship.tradeGoods.map((g) =>
                        g.item === goodId
                            ? { ...g, quantity: g.quantity + quantity }
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

    // Повышение репутации с расой за крупную торговлю (+1 за 20+ единиц)
    const dominantRace = state.currentLocation?.dominantRace;
    if (dominantRace && quantity >= REPUTATION_BUY_THRESHOLD) {
        const reputationGain = Math.floor(quantity / REPUTATION_BUY_THRESHOLD);
        get().changeReputation(dominantRace, reputationGain);
    }

    get().addLog(
        `Куплено: ${TRADE_GOODS[goodId].name} ${quantity}т за ${validation.price}₢`,
        "info",
    );
    playSound("shop");
};
