import type { GameState } from "@/game/types/game";
import { getActiveModules } from "@/lib";
/**
 * Получает лучшую эффективность топлива среди двигателей
 * Возвращает минимальное значение fuelEfficiency (лучше = меньше потребление)
 *
 * @param state - Текущее состояние игры
 * @returns Лучшая эффективность топлива (по умолчанию 20)
 */
export const getFuelEfficiency = (state: GameState) => {
    const engines = getActiveModules(state.ship.modules, "engine");
    if (engines.length === 0) return 20; // По умолчанию низкая эффективность
    // Используем лучшую (наименьшую) эффективность топлива
    return Math.min(...engines.map((e) => e.fuelEfficiency ?? 10));
};
