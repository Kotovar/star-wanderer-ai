import { store as i18nStore } from "@/lib/useTranslation";
import { crossedTurnInterval } from "@/game/utils/turnTicks";
import type { GameStore, SetState } from "@/game/types";

// === Constants ===
const PASSIVE_EXP_INTERVAL = 5;
const PASSIVE_EXP_AMOUNT = 2;

/**
 * Инициализирует новый ход
 * Сбрасывает флаги движения для экипажа и модулей
 */
export const initNewTurn = (set: SetState): void => {
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
export const processPassiveExperience = (get: () => GameStore): void => {
    const state = get();
    if (
        !crossedTurnInterval(state, PASSIVE_EXP_INTERVAL) ||
        state.crew.length === 0
    ) {
        return;
    }

    state.crew.forEach((c) => {
        get().gainExp(c, PASSIVE_EXP_AMOUNT);
    });

    get().addLog( i18nStore.t("game_logs.turnInit_1", { PASSIVE_EXP_AMOUNT }),
        "info",
    );
};
