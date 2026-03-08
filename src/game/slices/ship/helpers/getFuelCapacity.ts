import type { GameState } from "@/game/types/game";
import { getActiveModules } from "@/lib";

/**
 * Вычисляет максимальную вместимость топливного бака корабля
 * Суммирует capacity всех активных топливных баков
 *
 * @param state - Текущее состояние игры
 * @returns Общая вместимость топлива
 */
export const getFuelCapacity = (state: GameState) => {
    const tanks = getActiveModules(state.ship.modules, "fueltank");
    return tanks.reduce((sum, m) => sum + (m.capacity ?? 0), 0);
};
