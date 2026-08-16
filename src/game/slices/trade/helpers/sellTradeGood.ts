import { store as i18nStore } from "@/lib/useTranslation";
import { playSound } from "@/sounds";
import type { GameStore, SetState, Goods, StationPrices } from "@/game/types";
import type { SellValidation } from "./types";
import { applyReputationPriceModifier } from "@/game/reputation/priceModifier";
import { applyCrisisMarketModifier } from "@/game/stations/crisisMarket";
import {
    getPirateContrabandSellPrice,
    REPUTATION_SELL_THRESHOLD,
} from "../constants";
import { clampWantedHeat } from "@/game/slices/pirate/wanted";
import { getLivingShipCrew } from "@/game/crew/stationed";

const CONTRABAND_REP_PENALTY = 3;
const CONTRABAND_HEAT_PER_SELL = 4;

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
        return { canSell: false, error: i18nStore.t("game_logs.err_no_trade") };
    }

    const playerGood = state.ship.tradeGoods.find((g) => g.item === goodId);
    if (!playerGood || playerGood.quantity < quantity) {
        return { canSell: false, error: i18nStore.t("game_logs.err_no_goods") };
    }

    const isPirate = state.currentLocation?.stationConfig?.isPirate ?? false;
    if (goodId === "contraband" && !isPirate) {
        return {
            canSell: false,
            error: i18nStore.t("game_logs.err_contraband_pirate_only"),
        };
    }

    // Кризисный множитель применяется к обеим ценам — арбитраж невозможен
    const crisisPrices = applyCrisisMarketModifier(
        pricesFromTrade[goodId],
        state.activeCrisis?.id,
        goodId,
    );
    const pricePer5 = crisisPrices.sell;

    // Применяем модификатор репутации если есть доминирующая раса
    const raceId = state.currentLocation?.dominantRace;
    const buyPrice = crisisPrices.buy;
    let price: number;
    if (raceId && !isPirate) {
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

    // Pirate black market pays bonus for contraband
    if (isPirate && goodId === "contraband") {
        price = getPirateContrabandSellPrice(price);
    }

    // Торг ведут те, кто на борту и жив: приписанный к аванпосту за несколько
    // секторов отсюда не торчит у прилавка — ни жадный, ни торговец
    const tradingCrew = getLivingShipCrew(state.crew);

    // Штраф от жадных
    let greedyCrewCount = 0;
    tradingCrew.forEach((c) => {
        c.traits?.forEach((trait) => {
            if (trait.effect.sellPricePenalty) greedyCrewCount++;
        });
    });
    if (greedyCrewCount > 0) {
        price = Math.max(0, price - greedyCrewCount);
    }

    // Бонус от торговцев
    const traderBonus = tradingCrew.reduce((sum, c) => {
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
    const isPirate = state.currentLocation?.stationConfig?.isPirate ?? false;

    if (!stationId) {
        get().addLog( i18nStore.t("game_logs.sellTradeGood_1"), "error");
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

    const dominantRace = get().currentLocation?.dominantRace;

    // Пиратские станции не дают репутации за торговлю, но контрабанда оставляет след.
    if (isPirate) {
        if (goodId === "contraband" && dominantRace) {
            get().changeReputation(dominantRace, -CONTRABAND_REP_PENALTY);
            get().addLog(
                `☠️ Продажа контрабанды: репутация с ${dominantRace} -${CONTRABAND_REP_PENALTY}`,
                "warning",
            );
        }
        if (goodId === "contraband") {
            set((s) => ({
                wantedHeat: clampWantedHeat(
                    (s.wantedHeat ?? 0) + CONTRABAND_HEAT_PER_SELL,
                ),
            }));
            get().addLog(
                i18nStore.t("pirate.heat_trade", {
                    amount: CONTRABAND_HEAT_PER_SELL,
                }),
                "warning",
            );
        }
    } else if (dominantRace && quantity >= REPUTATION_SELL_THRESHOLD) {
        // Повышение репутации с расой за крупную торговлю (+1 за 20+ единиц)
        const reputationGain = Math.floor(quantity / REPUTATION_SELL_THRESHOLD);
        get().changeReputation(dominantRace, reputationGain);
    }

    // Логирование
    get().addLog( i18nStore.t("game_logs.sellTradeGood_2", { name: i18nStore.t(`trade.goods.${goodId}`), quantity, price: validation.price ?? 0 }),
        "info",
    );

    // Предупреждение о жадном экипаже
    if (validation.greedyCrewCount && validation.greedyCrewCount > 0) {
        get().addLog( i18nStore.t("game_logs.sellTradeGood_3", { greedyCrewCount: validation.greedyCrewCount, greedyCrewCount2: validation.greedyCrewCount }),
            "warning",
        );
    }

    playSound("ui_purchase");
};
