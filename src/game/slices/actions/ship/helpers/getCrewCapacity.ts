import type { GameState } from "@/game/types/game";
import { getActiveModules } from "@/lib";

/**
 * Вычисляет максимальную вместимость экипажа корабля
 * Суммирует oxygen всех активных модулей жизнеобеспечения
 *
 * @param state - Текущее состояние игры
 * @returns Общая вместимость экипажа
 */
export const getCrewCapacity = (state: GameState) => {
    const lifesupport = getActiveModules(state.ship.modules, "lifesupport");
    return lifesupport.reduce((sum, m) => sum + (m.oxygen ?? 0), 0);
};
