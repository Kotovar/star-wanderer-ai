import type { GameState } from "@/game/types/game";

/**
 * Вычисляет максимальную вместимость экипажа корабля
 * Равно числу модулей на корабле: каждый модуль — 1 место в команде
 *
 * @param state - Текущее состояние игры
 * @returns Количество мест для экипажа
 */
export const getCrewCapacity = (state: GameState) => {
    return state.ship.modules.length;
};
