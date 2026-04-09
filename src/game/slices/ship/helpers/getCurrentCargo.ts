import type { GameState } from "@/game/types";

/**
 * Рассчитывает текущее количество груза на корабле
 * @param state - Текущее состояние игры
 * @returns Общее количество груза
 */
export const getCurrentCargo = (state: GameState) =>
    state.ship.tradeGoods.reduce((sum, tg) => sum + tg.quantity, 0) +
    state.probes;
