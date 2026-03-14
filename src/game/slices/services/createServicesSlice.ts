import type { GameStore, SetState } from "@/game/types";
import {
    calculateRepairCost,
    calculateHealCost,
    repairShip as repairShipAction,
    healCrew as healCrewAction,
    installModuleFromCargo as installModuleFromCargoAction,
    scrapModule as scrapModuleAction,
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
     * Устанавливает модуль из грузового отсека
     * @param cargoIndex - Индекс в грузовом отсеке
     * @param x - Координата X
     * @param y - Координата Y
     */
    installModuleFromCargo: (cargoIndex: number, x: number, y: number) => void;
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

    /**
     * Уничтожает модуль корабля и возвращает деньги
     * @param moduleId - ID модуля для уничтожения
     */
    scrapModule: (moduleId: number) => void;
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

    installModuleFromCargo: (cargoIndex, x, y) =>
        installModuleFromCargoAction(set, get, cargoIndex, x, y),

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

    scrapModule: (moduleId) => scrapModuleAction(moduleId, set, get),
});
