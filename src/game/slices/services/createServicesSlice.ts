import type { GameStore, SetState } from "@/game/types";
import {
    calculateRepairCost,
    calculateHealCost,
    repairShip as repairShipAction,
    healCrew as healCrewAction,
    type ServiceCostResult,
} from "./helpers";

/**
 * Интерфейс ServicesSlice
 */
export interface ServicesSlice {
    /**
     * Ремонт всех модулей корабля
     * Восстанавливает здоровье всех модулей до максимального
     */
    repairShip: () => void;
    /**
     * Лечение экипажа
     * Восстанавливает здоровье и частично счастье
     */
    healCrew: () => void;
    /**
     * Проверяет, можно ли ремонтировать корабль
     * @returns true если есть повреждённые модули
     */
    canRepairShip: () => boolean;
    /**
     * Проверяет, можно ли лечить экипаж
     * @returns true если есть раненые члены экипажа
     */
    canHealCrew: () => boolean;
    /**
     * Рассчитывает стоимость ремонта
     * @returns Стоимость ремонта и процент повреждения
     */
    getRepairCost: () => ServiceCostResult;
    /**
     * Рассчитывает стоимость лечения
     * @returns Стоимость лечения и процент повреждения
     */
    getHealCost: () => ServiceCostResult;
}

/**
 * Создаёт services слайс для обработки услуг (ремонт, лечение и т.д.)
 */
export const createServicesSlice = (
    set: SetState,
    get: () => GameStore,
): ServicesSlice => ({
    repairShip: () => repairShipAction(set, get),

    healCrew: () => healCrewAction(set, get),

    canRepairShip: () => {
        const { canUse } = calculateRepairCost(get());
        return canUse;
    },

    canHealCrew: () => {
        const { canUse } = calculateHealCost(get());
        return canUse;
    },

    getRepairCost: () => calculateRepairCost(get()),

    getHealCost: () => calculateHealCost(get()),
});
