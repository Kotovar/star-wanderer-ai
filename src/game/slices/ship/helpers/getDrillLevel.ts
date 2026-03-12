import type { GameState } from "@/game/types/game";
import { getActiveModules } from "@/game/modules/utils";

/**
 * Получает максимальный уровень бура среди всех активных буров
 *
 * @param state - Текущее состояние игры
 * @returns Уровень бура (0 если нет активных буров)
 */
export const getDrillLevel = (state: GameState): number => {
    const drills = getActiveModules(state.ship.modules, "drill");
    if (drills.length === 0) return 0;
    // Возвращаем уровень лучшего бура
    return Math.max(...drills.map((d) => d.level ?? 1));
};
