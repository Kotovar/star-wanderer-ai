export type Goods =
    | "water"
    | "food"
    | "medicine"
    | "electronics"
    | "minerals"
    | "rare_minerals";

export interface TradeGood {
    item: Goods;
    quantity: number;
    buyPrice: number;
}
