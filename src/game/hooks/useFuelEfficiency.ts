import { useGameStore } from "@/game/store";
import {
    getRaceFuelEfficiencyModifier,
    getPilotFuelConsumptionModifier,
    getPlanetFuelEfficiencyModifier,
    getFuelEfficiency,
} from "@/game/slices/ship/helpers";

// Базовая эффективность двигателя 1 уровня
const BASE_ENGINE_EFFICIENCY = 10;

/**
 * Хук для получения текущей эффективности топлива
 *
 * @returns Объект с модификаторами и итоговым процентом эффективности
 */
export const useFuelEfficiency = () => {
    const state = useGameStore.getState();
    const crew = useGameStore((s) => s.crew);
    const activeEffects = useGameStore((s) => s.activeEffects);

    // Получаем текущую эффективность двигателя
    const currentFuelEfficiency = getFuelEfficiency(state);

    // Считаем базовый бонус от улучшения двигателя
    const engineBonus =
        currentFuelEfficiency < BASE_ENGINE_EFFICIENCY
            ? (BASE_ENGINE_EFFICIENCY - currentFuelEfficiency) /
              BASE_ENGINE_EFFICIENCY
            : 0;

    const raceModifier = getRaceFuelEfficiencyModifier(crew);
    const pilotModifier = getPilotFuelConsumptionModifier(crew);
    const planetModifier = getPlanetFuelEfficiencyModifier(activeEffects);

    // Общий модификатор: двигатель влияет на базовое потребление,
    // а остальные бонусы умножаются сверху
    const totalModifier =
        (1 - engineBonus) * raceModifier * pilotModifier * planetModifier;
    const efficiencyPercent = Math.round((1 - totalModifier) * 100);

    return {
        efficiencyPercent,
    };
};
