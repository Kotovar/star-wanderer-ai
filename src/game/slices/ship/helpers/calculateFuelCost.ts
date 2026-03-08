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
 * - Угловое расстояние между секторами (на одном тире и между тирами)
 * - Эффективность двигателей корабля
 * - Расовые бонусы экипажа (например, voidborn: +20% к эффективности топлива)
 * - Трейты пилота, влияющие на потребление топлива
 * - Бонусы от активных эффектов планеты (например, "Мистический ритуал")
 *
 * @param state - Текущее состояние игры
 * @param targetSectorId - Целевой сектор для перелёта
 * @returns Стоимость топлива в единицах (минимум 1, по умолчанию 5 при ошибке)
 */
export const calculateFuelCost = (state: GameState, targetSectorId: number) => {
    // Если мы в пути, используем тир назначения как текущий
    const currentTier = state.traveling
        ? state.traveling.destination.tier
        : (state.currentSector?.tier ?? 1);

    const targetSector = state.galaxy.sectors.find(
        (s) => s.id === targetSectorId,
    );
    if (!targetSector) return DEFAULT_FUEL_COST;

    const targetTier = targetSector.tier;
    const tierDistance = Math.abs(targetTier - currentTier);

    // Рассчитываем угловое расстояние между секторами (для всех прыжков)
    let angularDistance = 0;
    if (state.currentSector) {
        const currentAngle = state.currentSector.mapAngle ?? 0;
        const targetAngle = targetSector.mapAngle ?? 0;

        // Минимальный угол между двумя точками на круге (0 to π)
        let angleDiff = Math.abs(targetAngle - currentAngle);
        angleDiff = angleDiff % (2 * Math.PI);
        if (angleDiff > Math.PI) {
            angleDiff = 2 * Math.PI - angleDiff;
        }

        // Нормализуем: полный круг = 12 секторов, angleDiff = 2π
        // angularDistance = 0 (тот же сектор) to 6 (противоположная сторона)
        angularDistance = (angleDiff / (2 * Math.PI)) * 12;
    }

    // Базовая стоимость:
    // - Внутри тира: 1 + angularDistance * 0.1
    // - Между тирами: tierDistance * 1.5 + angularDistance * 0.2
    let distanceMultiplier: number;
    if (tierDistance === 0) {
        // Intra-tier: базовая стоимость 1 + бонус за угловое расстояние
        distanceMultiplier =
            (1 + angularDistance * 0.1) * BASE_FUEL_COST_MULTIPLIER;
    } else {
        // Inter-tier: tierDistance * 1.5 + бонус за угловое расстояние
        distanceMultiplier =
            (tierDistance * 1.5 + angularDistance * 0.2) *
            BASE_FUEL_COST_MULTIPLIER;
    }

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
