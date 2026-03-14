import type { GameStore, Goods, SetState } from "@/game/types";
import { buyTradeGood as buyTradeGoodAction } from "./helpers";
import { sellTradeGood as sellTradeGoodAction } from "./helpers";

/**
 * Интерфейс TradeSlice
 */
export interface TradeSlice {
    /**
     * Покупка торгового товара
     * @param goodId - ID товара
     * @param quantity - Количество (по умолчанию 5)
     */
    buyTradeGood: (goodId: Goods, quantity?: number) => void;
    /**
     * Продажа торгового товара
     * @param goodId - ID товара
     * @param quantity - Количество (по умолчанию 5)
     */
    sellTradeGood: (goodId: Goods, quantity?: number) => void;
}

/**
 * Создаёт trade слайс для обработки торговли товарами
 */
export const createTradeSlice = (
    set: SetState,
    get: () => GameStore,
): TradeSlice => ({
    buyTradeGood: (goodId, quantity = 5) =>
        buyTradeGoodAction(set, get, goodId, quantity),

    sellTradeGood: (goodId, quantity = 5) =>
        sellTradeGoodAction(set, get, goodId, quantity),
});
