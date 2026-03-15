import { DeliveryGoods } from "@/game/types/contracts";

export const DELIVERY_GOODS: Record<DeliveryGoods, { name: string }> = {
    spares: { name: "Запчасти" },
    fuel: { name: "Топливо" },
    construction_materials: { name: "Стройматериалы" },
    scientific_equipment: { name: "Научное оборудование" },
    diplomatic_cargo: { name: "Дипломатический груз" },
};
