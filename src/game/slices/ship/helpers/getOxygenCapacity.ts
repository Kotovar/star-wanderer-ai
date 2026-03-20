import type { GameState } from "@/game/types/game";
import { getActiveModules } from "@/game/modules/utils";
import { getMergeEffectsBonus } from "@/game/slices/crew/helpers";

/**
 * Вычисляет суммарную кислородную ёмкость корабля
 * Суммирует oxygen всех активных модулей жизнеобеспечения
 *
 * @param state - Текущее состояние игры
 * @returns Общая кислородная ёмкость
 */
export const getOxygenCapacity = (state: GameState) => {
    const lifesupport = getActiveModules(state.ship.modules, "lifesupport");
    let capacity = lifesupport.reduce((sum, m) => sum + (m.oxygen ?? 0), 0);

    const mergeBonus = getMergeEffectsBonus(state.crew, state.ship.modules);
    if (mergeBonus.oxygenEfficiency) {
        capacity = Math.floor(
            capacity * (1 + mergeBonus.oxygenEfficiency / 100),
        );
    }

    return capacity;
};
