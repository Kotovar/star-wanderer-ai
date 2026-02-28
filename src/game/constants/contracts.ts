import { ContractType, DeliveryGoods } from "@/game/types/contracts";

// Contract reward configuration (experience points)
export const CONTRACT_REWARDS: Record<
    ContractType,
    { baseExp: number; threatBonus?: number }
> = {
    delivery: { baseExp: 10 },
    scan_planet: { baseExp: 12 },
    combat: { baseExp: 15, threatBonus: 5 },
    rescue: { baseExp: 25 },
    mining: { baseExp: 25 },
    patrol: { baseExp: 20 },
    bounty: { baseExp: 20, threatBonus: 8 },
    supply_run: { baseExp: 15 },
    diplomacy: { baseExp: 15 },
    rescueSurvivors: { baseExp: 15 },
    research: { baseExp: 20 },
};

export const DELIVERY_GOODS: Record<DeliveryGoods, { name: string }> = {
    spares: { name: "Запчасти" },
    fuel: { name: "Топливо" },
    construction_materials: { name: "Стройматериалы" },
    scientific_equipment: { name: "Научное оборудование" },
    diplomatic_cargo: { name: "Дипломатический груз" },
};
