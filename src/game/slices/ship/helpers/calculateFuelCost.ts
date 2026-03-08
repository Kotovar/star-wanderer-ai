import type { GameState } from "@/game/types/game";
import {
    getFuelEfficiency,
    getRaceFuelEfficiencyModifier,
    getPilotFuelConsumptionModifier,
    getPlanetFuelEfficiencyModifier,
} from "@/game/slices/ship";
import { BASE_FUEL_COST_MULTIPLIER, DEFAULT_FUEL_COST } from "@/game/constants";

/**
 * Вычисляет стоимость перелёта в другой сектор
 *
 * Учитывает:
 * - Расстояние между тирами секторов
 * - Эффективность двигателей корабля
 * - Расовые бонусы экипажа (например, voidborn: +20% к эффективности топлива)
 * - Трейты пилота, влияющие на потребление топлива
 * - Бонусы от активных эффектов планеты (например, "Мистический ритуал")
 *
 * @param state - Текущее состояние игры
 * @param targetTier - Целевой тир сектора для перелёта
 * @returns Стоимость топлива в единицах (минимум 1, по умолчанию 5 при ошибке)
 */
export const calculateFuelCost = (state: GameState, targetTier: number) => {
    // Если мы в пути, используем тир назначения как текущий
    const currentTier = state.traveling
        ? state.traveling.destination.tier
        : (state.currentSector?.tier ?? 1);
    const distance = Math.abs(targetTier - currentTier);

    // Базовая стоимость: BASE_FUEL_COST_MULTIPLIER за тир расстояния
    // Прыжки внутри тира (distance = 0): 1 × fuelEfficiency
    // Прыжки на 1 тир (distance = 1): 1.5 × fuelEfficiency
    // Прыжки на 2 тира (distance = 2): 2 × fuelEfficiency
    const distanceMultiplier = (1 + distance * 0.5) * BASE_FUEL_COST_MULTIPLIER;
    const fuelEfficiency = getFuelEfficiency(state);
    const baseCost = distanceMultiplier * fuelEfficiency;

    // Собираем все модификаторы
    const raceModifier = getRaceFuelEfficiencyModifier(state.crew);
    const pilotModifier = getPilotFuelConsumptionModifier(state.crew);
    const planetModifier = getPlanetFuelEfficiencyModifier(state.activeEffects);

    const result = Math.ceil(
        baseCost * raceModifier * pilotModifier * planetModifier,
    );

    // Защита от NaN
    return Number.isNaN(result) ? DEFAULT_FUEL_COST : result;
};
