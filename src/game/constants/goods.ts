import type { Goods } from "@/game/types";

export const TRADE_GOODS: Record<Goods, { name: string; basePrice: number }> = {
    water: { name: "Вода", basePrice: 50 },
    food: { name: "Продукты", basePrice: 80 },
    medicine: { name: "Медикаменты", basePrice: 150 },
    electronics: { name: "Электроника", basePrice: 200 },
    minerals: { name: "Минералы", basePrice: 100 },
    rare_minerals: { name: "Редкие минералы", basePrice: 500 },
};
