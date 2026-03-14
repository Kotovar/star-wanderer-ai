import type { SetState, GameStore } from "@/game/types";
import { canPlaceModule as canPlaceModuleHelper } from "./canPlaceModule";

/**
 * Перемещает модуль на новые координаты
 *
 * @param moduleId - ID модуля для перемещения
 * @param x - Координата X
 * @param y - Координата Y
 * @param set - Функция обновления состояния
 * @param get - Функция получения состояния
 */
export const moveModule = (
    moduleId: number,
    x: number,
    y: number,
    set: SetState,
    get: () => GameStore,
): void => {
    const state = get();

    // Check if any module was already moved this turn
    if (state.ship.moduleMovedThisTurn) {
        get().addLog("Модуль уже перемещался в этот ход!", "warning");
        return;
    }

    const mod = state.ship.modules.find((m) => m.id === moduleId);
    if (!mod) return;

    if (canPlaceModuleHelper(mod, x, y, state)) {
        set((s) => ({
            ship: {
                ...s.ship,
                modules: s.ship.modules.map((m) =>
                    m.id === moduleId
                        ? { ...m, x, y, movedThisTurn: true }
                        : m,
                ),
                moduleMovedThisTurn: true,
            },
        }));
        get().addLog(`Модуль ${mod.name} перемещён`, "info");
    } else {
        get().addLog(
            "Невозможно разместить: нарушена связность",
            "error",
        );
    }
};
