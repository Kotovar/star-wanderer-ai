import type { Goods, TradeGood } from "@/game/types";

/**
 * Добавляет товар в трюм, объединяя с существующей пачкой того же типа.
 * Если такого товара ещё нет — создаёт новую запись.
 */
export const addTradeGood = (
    tradeGoods: TradeGood[],
    item: Goods,
    quantity: number,
    buyPrice = 0,
): TradeGood[] => {
    const existing = tradeGoods.find((g) => g.item === item);
    if (existing) {
        return tradeGoods.map((g) =>
            g.item === item ? { ...g, quantity: g.quantity + quantity } : g,
        );
    }
    return [...tradeGoods, { item, quantity, buyPrice }];
};
