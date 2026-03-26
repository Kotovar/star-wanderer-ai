import { initialModules } from "@/game/modules";
import type { GameState } from "@/game/types/game";
import { isModuleFunctional } from "@/game/slices/ship/utils";

const fuelEfficiencyDefault =
    initialModules.find((module) => module.type === "engine")?.fuelEfficiency ??
    10;

/**
 * Получает лучшую эффективность топлива среди двигателей
 * Возвращает минимальное значение fuelEfficiency (лучше = меньше потребление)
 *
 * @param state - Текущее состояние игры
 * @returns Лучшая эффективность топлива (20 если нет активных двигателей)
 */
export const getFuelEfficiency = (state: GameState) => {
    const engines = state.ship.modules.filter(
        (m) => (m.type === "engine" || m.type === "pulse_drive") && isModuleFunctional(m),
    );
    if (engines.length === 0) return 20;
    // Используем лучшую (наименьшую) эффективность топлива
    return Math.min(
        ...engines.map((e) => e.fuelEfficiency ?? fuelEfficiencyDefault),
    );
};
