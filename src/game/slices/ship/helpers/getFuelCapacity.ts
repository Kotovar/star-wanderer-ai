import type { GameState } from "@/game/types/game";
import { getActiveModules } from "@/game/modules/utils";
import { getMergeEffectsBonus } from "@/game/slices/crew/helpers";

/**
 * Вычисляет максимальную вместимость топливного бака корабля
 * Суммирует capacity всех активных топливных баков
 *
 * @param state - Текущее состояние игры
 * @returns Общая вместимость топлива
 */
export const getFuelCapacity = (state: GameState) => {
    const tanks = getActiveModules(state.ship.modules, "fueltank");
    let capacity = tanks.reduce((sum, m) => sum + (m.capacity ?? 0), 0);

    // === Бонус от сращивания ксеноморфов ===
    const mergeBonus = getMergeEffectsBonus(state.crew, state.ship.modules);
    if (mergeBonus.fuelCapacity) {
        capacity = Math.floor(capacity * (1 + mergeBonus.fuelCapacity / 100));
    }

    return capacity;
};
