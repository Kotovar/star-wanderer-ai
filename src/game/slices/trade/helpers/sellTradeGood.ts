import { TRADE_GOODS } from "@/game/constants";
import { playSound } from "@/sounds";
import type { GameStore, SetState, Goods, StationPrices } from "@/game/types";
import type { SellValidation } from "./types";
import { applyReputationPriceModifier } from "@/game/reputation/priceModifier";
import { REPUTATION_SELL_THRESHOLD } from "../constants";

/**
 * Проверяет возможность продажи товара
 * @param state - Текущее состояние игры
 * @param goodId - ID товара
 * @param quantity - Количество
 * @param stationId - ID станции
 * @param stationPrices - Цены станции
 * @returns Результат проверки
 */
const validateSellTradeGood = (
    state: GameStore,
    goodId: Goods,
    quantity: number,
    stationId: string,
    stationPrices: StationPrices,
): SellValidation => {
    const pricesFromTrade = stationPrices[stationId];

    if (!pricesFromTrade) {
        return { canSell: false, error: "Недоступно для торговли" };
    }

    const playerGood = state.ship.tradeGoods.find((g) => g.item === goodId);
    if (!playerGood || playerGood.quantity < quantity) {
        return { canSell: false, error: "Недостаточно товара!" };
    }

    const pricePer5 = pricesFromTrade[goodId].sell;

    // Применяем модификатор репутации если есть доминирующая раса
    const raceId = state.currentLocation?.dominantRace;
    const buyPrice = pricesFromTrade[goodId].buy;
    let price: number;
    if (raceId) {
        price = applyReputationPriceModifier(
            state.raceReputation,
            raceId,
            pricePer5,
            "sell",
            buyPrice, // Anti-arbitrage: ensure sell < buy
            quantity,
        );
    } else {
        price = Math.floor(pricePer5 * (quantity / 5));
    }

    // Штраф от жадных
    let greedyCrewCount = 0;
    state.crew.forEach((c) => {
        c.traits?.forEach((trait) => {
            if (trait.effect.sellPricePenalty) greedyCrewCount++;
        });
    });
    if (greedyCrewCount > 0) {
        price = Math.max(0, price - greedyCrewCount);
    }

    // Бонус от торговцев
    const traderBonus = state.crew.reduce((sum, c) => {
        return (
            sum +
            (c.traits?.reduce(
                (s, t) => s + (t.effect.sellPriceBonus ?? 0),
                0,
            ) ?? 0)
        );
    }, 0);
    if (traderBonus > 0) {
        price = Math.floor(price * (1 + traderBonus));
    }

    return { canSell: true, price: Math.floor(price), greedyCrewCount };
};

/**
 * Продажа торгового товара
 * @param set - Функция обновления состояния
 * @param get - Функция получения состояния
 * @param goodId - ID товара
 * @param quantity - Количество
 */
export const sellTradeGood = (
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

    const validation = validateSellTradeGood(
        state,
        goodId,
        quantity,
        stationId,
        state.stationPrices,
    );

    if (!validation.canSell) {
        if (validation.error) {
            get().addLog(validation.error, "error");
        }
        return;
    }

    // Обновление товаров
    set((s) => {
        const good = s.ship.tradeGoods.find((g) => g.item === goodId);
        if (!good) return s;

        const newQuantity = good.quantity - quantity;
        if (newQuantity <= 0) {
            return {
                ship: {
                    ...s.ship,
                    tradeGoods: s.ship.tradeGoods.filter(
                        (g) => g.item !== goodId,
                    ),
                },
            };
        } else {
            return {
                ship: {
                    ...s.ship,
                    tradeGoods: s.ship.tradeGoods.map((g) =>
                        g.item === goodId
                            ? { ...g, quantity: g.quantity - quantity }
                            : g,
                    ),
                },
            };
        }
    });

    // Обновление кредитов
    set((s) => ({ credits: s.credits + (validation.price ?? 0) }));

    // Повышение репутации с расой за крупную торговлю (+1 за 20+ единиц)
    const dominantRace = get().currentLocation?.dominantRace;
    if (dominantRace && quantity >= REPUTATION_SELL_THRESHOLD) {
        const reputationGain = Math.floor(quantity / REPUTATION_SELL_THRESHOLD);
        get().changeReputation(dominantRace, reputationGain);
    }

    // Логирование
    get().addLog(
        `Продано: ${TRADE_GOODS[goodId].name} ${quantity}т за ${validation.price}₢`,
        "info",
    );

    // Предупреждение о жадном экипаже
    if (validation.greedyCrewCount && validation.greedyCrewCount > 0) {
        get().addLog(
            `⚠️ Жадный экипаж (${validation.greedyCrewCount} сущ.): -${validation.greedyCrewCount}₢ к цене продажи`,
            "warning",
        );
    }

    playSound("message");
};
