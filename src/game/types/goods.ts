export type Goods =
    | "water"
    | "food"
    | "medicine"
    | "electronics"
    | "minerals"
    | "rare_minerals"
    | "spares";

export interface TradeGood {
    item: Goods;
    quantity: number;
    buyPrice: number;
}

export type StationPrices = Record<
    string,
    Record<Goods, { buy: number; sell: number }>
>;

export type StationStock = Record<string, Record<Goods, number>>;
