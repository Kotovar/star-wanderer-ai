import type { GameState } from "@/game/types/game";
import { getActiveModules } from "@/lib";
import { getMergeEffectsBonus } from "@/game/slices/crew/helpers";

/**
 * Вычисляет максимальную вместимость экипажа корабля
 * Суммирует oxygen всех активных модулей жизнеобеспечения
 *
 * @param state - Текущее состояние игры
 * @returns Общая вместимость экипажа
 */
export const getCrewCapacity = (state: GameState) => {
    const lifesupport = getActiveModules(state.ship.modules, "lifesupport");
    let capacity = lifesupport.reduce((sum, m) => sum + (m.oxygen ?? 0), 0);

    // === Бонус от сращивания ксеноморфов ===
    const mergeBonus = getMergeEffectsBonus(state.crew, state.ship.modules);
    if (mergeBonus.oxygenEfficiency) {
        capacity = Math.floor(
            capacity * (1 + mergeBonus.oxygenEfficiency / 100),
        );
    }

    return capacity;
};
