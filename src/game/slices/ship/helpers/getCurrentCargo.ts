import type { GameState } from "@/game/types";

/**
 * Рассчитывает текущее количество груза на корабле
 * @param state - Текущее состояние игры
 * @returns Общее количество груза
 */
export const getCurrentCargo = (state: GameState) =>
    state.ship.cargo.reduce((sum, cargo) => sum + cargo.quantity, 0) +
    state.ship.tradeGoods.reduce((sum, tg) => sum + tg.quantity, 0) +
    state.probes;
