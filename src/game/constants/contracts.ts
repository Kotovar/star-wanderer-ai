import { DeliveryGoods } from "@/game/types/contracts";

export const EXPEDITION_DISCOVERIES = [3, 5, 7] as const;

export const DELIVERY_GOODS: Record<DeliveryGoods, { name: string }> = {
    spares: { name: "Запчасти" },
    fuel: { name: "Топливо" },
    construction_materials: { name: "Стройматериалы" },
    scientific_equipment: { name: "Научное оборудование" },
    diplomatic_cargo: { name: "Дипломатический груз" },
};
