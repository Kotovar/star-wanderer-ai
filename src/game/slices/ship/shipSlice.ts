import type { GameState } from "@/game/types/game";
import { findActiveArtifact, getArtifactEffectValue } from "@/game/artifacts";
import {
    calculateAverageDefense,
    calculateTotalFuelCapacity,
    calculateTotalOxygen,
    calculateTotalShields,
} from "./utils";
import { WeaponTypeTotal } from "@/game/types";
import { getTotalDamage } from "./helpers/getTotalDamage";
import {
    getTotalConsumption,
    getTotalPower,
    getCrewCapacity,
    getFuelCapacity,
    getFuelEfficiency,
    getDrillLevel,
    getCargoCapacity,
    calculateFuelCost,
} from "./helpers";
import { ARTIFACT_TYPES } from "@/game/constants";

/**
 * Расширенный интерфейс ShipSlice с геттерами
 * Содержит методы для управления состоянием корабля и вычисления характеристик
 */
export interface ShipSlice {
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
}

/**
 * Создаёт слайс корабля с поддержкой immer
 *
 * @param set - Функция для обновления состояния
 * @param get - Функция для получения текущего состояния
 * @returns Объект с методами управления кораблём
 */
export const createShipSlice = (
    set: (fn: (state: GameState & ShipSlice) => void) => void,
    get: () => GameState & ShipSlice,
): ShipSlice => ({
    updateShipStats: () => {
        set((state) => {
            const { artifacts, ship } = state;
            const { modules } = ship;

            // === Расчёт защиты ===
            const averageDefense = calculateAverageDefense(modules);
            const crystallineArmor = findActiveArtifact(
                artifacts,
                ARTIFACT_TYPES.CRYSTALLINE_ARMOR,
            );
            let finalDefense = averageDefense;

            if (crystallineArmor) {
                const armorBonus = getArtifactEffectValue(
                    crystallineArmor,
                    state,
                );
                finalDefense += armorBonus;
            }

            // === Расчёт щитов ===
            let totalShields = calculateTotalShields(modules);

            const darkShield = findActiveArtifact(
                artifacts,
                ARTIFACT_TYPES.DARK_SHIELD,
            );
            if (darkShield) {
                totalShields += getArtifactEffectValue(darkShield, state);
            }

            // Сохраняем бонусные щиты от эффектов планет
            const bonusShields = ship.bonusShields || 0;
            const maxShieldsWithBonus = totalShields + bonusShields;

            // === Расчёт кислорода и топлива ===
            const totalOxygen = calculateTotalOxygen(modules);
            const totalFuelCapacity = calculateTotalFuelCapacity(modules);

            // Защита от NaN или undefined для текущего топлива
            const currentFuel = ship.fuel || 0;

            // === Обновление состояния корабля ===
            state.ship.armor = finalDefense;
            state.ship.maxShields = maxShieldsWithBonus;
            state.ship.shields = Math.min(
                state.ship.shields,
                maxShieldsWithBonus,
            );
            state.ship.crewCapacity = totalOxygen;
            state.ship.maxFuel = totalFuelCapacity;
            state.ship.fuel = Math.min(currentFuel, totalFuelCapacity);
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

    calculateFuelCost: (targetSectorId: number) => {
        const state = get();
        return calculateFuelCost(state, targetSectorId);
    },
});
