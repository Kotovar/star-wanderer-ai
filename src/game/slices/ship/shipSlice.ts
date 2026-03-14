import type { GameStore, SetState, Module } from "@/game/types";
import { WeaponTypeTotal } from "@/game/types";
import {
    getTotalConsumption,
    getTotalPower,
    getCrewCapacity,
    getFuelCapacity,
    getFuelEfficiency,
    getDrillLevel,
    getCargoCapacity,
    areModulesFunctional,
    updateShipStats,
    getTotalDamage,
    toggleModule as toggleModuleHelper,
    moveModule as moveModuleHelper,
    canPlaceModule as canPlaceModuleHelper,
} from "./helpers";
import { getMergeEffectsBonus } from "@/game/slices/crew/helpers";
import { calculateFuelCostForUI } from "@/game/slices/travel/helpers";
import { refuel } from "./helpers/fuel";
import { areModulesAdjacent } from "@/game/modules/adjacency";

/**
 * Расширенный интерфейс ShipSlice с геттерами
 * Содержит методы для управления состоянием корабля и вычисления характеристик
 */
interface ShipSlice {
    /**
     * Обновляет все характеристики корабля
     * Пересчитывает защиту, щиты, кислород, топливо и ёмкость экипажа
     * на основе текущих модулей, артефактов и эффектов
     */
    updateShipStats: () => void;

    /**
     * Вычисляет общую мощность энергии корабля
     * Учитывает модули, назначения экипажа, артефакты и эффекты планет
     * @returns Общая мощность энергии
     */
    getTotalPower: () => number;

    /**
     * Вычисляет общее потребление энергии кораблём
     * Учитывает модули, расовые бонусы экипажа и назначения
     * @returns Общее потребление энергии
     */
    getTotalConsumption: () => number;

    /**
     * Вычисляет общий урон корабля по типам оружия
     * @returns Объект с уроном по типам: total, kinetic, laser, missile
     */
    getTotalDamage: () => Record<WeaponTypeTotal, number>;

    /**
     * Вычисляет максимальную вместимость экипажа корабля
     * Суммирует oxygen всех активных модулей жизнеобеспечения
     * @returns Общая вместимость экипажа
     */
    getCrewCapacity: () => number;

    /**
     * Вычисляет максимальную вместимость топливного бака
     * Суммирует capacity всех активных топливных баков
     * @returns Общая вместимость топлива
     */
    getFuelCapacity: () => number;

    /**
     * Получает лучшую эффективность топлива среди двигателей
     * Возвращает минимальное значение fuelEfficiency (лучше = меньше потребление)
     * @returns Лучшая эффективность топлива (по умолчанию 20)
     */
    getFuelEfficiency: () => number;

    /**
     * Получает максимальный уровень бура среди всех активных буров
     * @returns Уровень бура (0 если нет активных буров)
     */
    getDrillLevel: () => number;

    /**
     * Вычисляет общую грузоподъёмность корабля
     * Суммирует capacity всех активных грузовых модулей
     * @returns Общая грузоподъёмность (по умолчанию 40 на модуль)
     */
    getCargoCapacity: () => number;

    /**
     * Вычисляет стоимость перелёта в другой сектор
     *
     * Учитывает:
     * - Расстояние между тирами секторов
     * - Угловое расстояние между секторами на одном тире (для intra-tier прыжков)
     * - Эффективность двигателей корабля
     * - Расовые бонусы экипажа (например, voidborn: +20% к эффективности топлива)
     * - Трейты пилота, влияющие на потребление топлива
     * - Бонусы от активных эффектов планеты (например, "Мистический ритуал")
     *
     * @param targetSectorId - Целевой сектор для перелёта
     * @returns Стоимость топлива в единицах (минимум 1, по умолчанию 5 при ошибке)
     */
    calculateFuelCost: (targetSectorId: number) => number;

    /**
     * Проверяет, работает ли хотя бы один двигатель
     * Двигатель считается рабочим, если он не отключён вручную, не отключён автоматически и имеет здоровье > 0
     * @returns true если есть рабочий двигатель
     */
    areEnginesFunctional: () => boolean;

    /**
     * Проверяет, работает ли хотя бы один топливный бак
     * Бак считается рабочим, если он не отключён и имеет здоровье > 0
     * @returns true если есть рабочий топливный бак
     */
    areFuelTanksFunctional: () => boolean;

    /**
     * Заправляет корабль топливом
     *
     * @param amount - Количество топлива для заправки
     * @param price - Стоимость заправки в кредитах
     */
    refuel: (amount: number, price: number) => void;

    /**
     * Получает суммарные бонусы от сращивания ксеноморфов
     * @returns Объект с бонусами от сращивания
     */
    getMergeEffectsBonus: () => ReturnType<typeof getMergeEffectsBonus>;

    /**
     * Проверяет, являются ли два модуля соседними
     * @param moduleId1 - ID первого модуля
     * @param moduleId2 - ID второго модуля
     * @returns true если модули соседние
     */
    isModuleAdjacent: (moduleId1: number, moduleId2: number) => boolean;

    /**
     * Включает/отключает модуль
     * @param moduleId - ID модуля
     */
    toggleModule: (moduleId: number) => void;

    /**
     * Перемещает модуль на новые координаты
     * @param moduleId - ID модуля
     * @param x - Координата X
     * @param y - Координата Y
     */
    moveModule: (moduleId: number, x: number, y: number) => void;

    /**
     * Проверяет, можно ли разместить модуль на указанных координатах
     * @param module - Модуль для размещения
     * @param x - Координата X
     * @param y - Координата Y
     * @returns true если размещение возможно
     */
    canPlaceModule: (module: Module, x: number, y: number) => boolean;
}

/**
 * Создаёт слайс корабля с поддержкой immer
 *
 * @param set - Функция для обновления состояния
 * @param get - Функция для получения текущего состояния
 * @returns Объект с методами управления кораблём
 */
export const createShipSlice = (
    set: SetState,
    get: () => GameStore,
): ShipSlice => ({
    updateShipStats: () => {
        set((state) => {
            updateShipStats(state);
            return state;
        });
    },

    getTotalPower: () => {
        const state = get();
        return getTotalPower(state);
    },

    getTotalConsumption: () => {
        const state = get();
        return getTotalConsumption(state);
    },

    getTotalDamage: () => {
        const state = get();
        return getTotalDamage(state);
    },

    getCrewCapacity: () => {
        const state = get();
        return getCrewCapacity(state);
    },

    getFuelCapacity: () => {
        const state = get();
        return getFuelCapacity(state);
    },

    getFuelEfficiency: () => {
        const state = get();
        return getFuelEfficiency(state);
    },

    getDrillLevel: () => {
        const state = get();
        return getDrillLevel(state);
    },

    getCargoCapacity: () => {
        const state = get();
        return getCargoCapacity(state);
    },

    calculateFuelCost: (targetSectorId) => {
        const state = get();
        return calculateFuelCostForUI(state, targetSectorId).fuelCost;
    },

    areEnginesFunctional: () => {
        const state = get();
        return areModulesFunctional(state, "engine");
    },

    areFuelTanksFunctional: () => {
        const state = get();
        return areModulesFunctional(state, "fueltank");
    },

    refuel: (amount: number, price: number) => {
        const state = get();
        refuel(state, amount, price, get().addLog, set);
    },

    getMergeEffectsBonus: () => {
        const state = get();
        return getMergeEffectsBonus(state.crew, state.ship.modules);
    },

    isModuleAdjacent: (moduleId1, moduleId2) => {
        const state = get();
        const mod1 = state.ship.modules.find((m) => m.id === moduleId1);
        const mod2 = state.ship.modules.find((m) => m.id === moduleId2);
        if (!mod1 || !mod2) return false;
        return areModulesAdjacent(mod1, mod2);
    },

    toggleModule: (moduleId) => {
        toggleModuleHelper(moduleId, set, get);
    },

    moveModule: (moduleId, x, y) => {
        moveModuleHelper(moduleId, x, y, set, get);
    },

    canPlaceModule: (module, x, y) => {
        return canPlaceModuleHelper(module, x, y, get());
    },
});
