import type { GameState } from "@/game/types/game";
import { getActiveModules } from "@/game/modules/utils";

/**
 * Вычисляет максимальную вместимость экипажа корабля.
 *
 * Базовая вместимость = число модулей, НЕ являющихся жилыми (quarters).
 * Каждый модуль занимает место на корабле — это и есть «рабочее место» члена экипажа.
 *
 * Жилые модули (quarters) не считаются в базу, но добавляют
 * свою вместимость через поле capacity (1/2/3/6 для уровней 1-4).
 *
 * @param state - Текущее состояние игры
 * @returns Количество мест для экипажа
 */
export const getCrewCapacity = (state: GameState) => {
    const baseSlots = state.ship.modules.filter(
        (m) => m.type !== "quarters",
    ).length;

    const quartersBonus = getActiveModules(state.ship.modules, "quarters").reduce(
        (sum, m) => sum + (m.capacity ?? 0),
        0,
    );

    return baseSlots + quartersBonus;
};
