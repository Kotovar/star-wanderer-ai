import { useGameStore } from "@/game/store";
import {
    getRaceFuelEfficiencyModifier,
    getPilotFuelConsumptionModifier,
    getPlanetFuelEfficiencyModifier,
    getFuelEfficiency,
} from "@/game/slices/ship/helpers";
import { RESEARCH_TREE } from "@/game/constants/research";

// Базовая эффективность двигателя 1 уровня
const BASE_ENGINE_EFFICIENCY = 10;

// Максимальный бонус эффективности топлива от технологий (90%)
const MAX_FUEL_EFFICIENCY_BONUS = 0.9;

// Эффективность топлива при наличии варп-драйва (100% — бесплатные прыжки)
const WARP_DRIVE_EFFICIENCY = 100;

/**
 * Хук для получения текущей эффективности топлива
 *
 * @returns Объект с модификаторами и итоговым процентом эффективности
 */
export const useFuelEfficiency = () => {
    const state = useGameStore.getState();
    const crew = useGameStore((s) => s.crew);
    const activeEffects = useGameStore((s) => s.activeEffects);
    const researchedTechs = useGameStore((s) => s.research.researchedTechs);

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

    // Бонус от технологий (fuel_efficiency)
    // warp_drive обрабатывается отдельно (бесплатные прыжки)
    const techFuelBonus = researchedTechs
        .filter((techId) => techId !== "warp_drive")
        .reduce((sum, techId) => {
            const tech = RESEARCH_TREE[techId];
            return (
                sum +
                tech.bonuses
                    .filter((b) => b.type === "fuel_efficiency")
                    .reduce((s, b) => s + b.value, 0)
            );
        }, 0);

    // Ограничиваем максимальный бонус технологий
    const cappedTechFuelBonus = Math.min(
        techFuelBonus,
        MAX_FUEL_EFFICIENCY_BONUS,
    );

    // Проверяем наличие варп-драйва
    const hasWarpDrive = researchedTechs.includes("warp_drive");

    // Если есть варп-драйв — эффективность 100% (бесплатные прыжки)
    if (hasWarpDrive) {
        return { efficiencyPercent: WARP_DRIVE_EFFICIENCY };
    }

    // Общий модификатор: двигатель влияет на базовое потребление,
    // а остальные бонусы умножаются сверху
    const totalModifier =
        (1 - engineBonus) *
        raceModifier *
        pilotModifier *
        planetModifier *
        (1 - cappedTechFuelBonus);
    const efficiencyPercent = Math.round((1 - totalModifier) * 100);

    return {
        efficiencyPercent,
    };
};
