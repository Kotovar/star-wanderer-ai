import type { GameState, GameStore } from "@/game/types";

/**
 * Инициализирует новый ход
 * Сбрасывает флаги движения для экипажа и модулей
 */
export const initNewTurn = (
    set: (fn: (s: GameState) => void) => void,
): void => {
    set((s) => ({
        turn: s.turn + 1,
        randomEventCooldown: s.randomEventCooldown - 1,
        crew: s.crew.map((c) => ({
            ...c,
            movedThisTurn: false,
        })),
        ship: {
            ...s.ship,
            moduleMovedThisTurn: false,
            modules: s.ship.modules.map((m) => ({
                ...m,
                movedThisTurn: false,
            })),
        },
    }));
};

/**
 * Пассивный опыт экипажа каждые 5 ходов
 */
export const processPassiveExperience = (
    state: GameState,
    get: () => GameStore,
): void => {
    if (state.turn % 5 === 0 && state.crew.length > 0) {
        state.crew.forEach((c) => {
            get().gainExp(c, 2);
        });
        get().addLog(`📋 Экипаж получил +2 опыта (службу на корабле)`, "info");
    }
};
