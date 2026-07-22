import { store as i18nStore } from "@/lib/useTranslation";
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
        get().addLog( i18nStore.t("game_logs.moveModule_1"), "warning");
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
        get().addLog( i18nStore.t("game_logs.moveModule_2", { mod_name: mod.name }), "info");
    } else {
        get().addLog( i18nStore.t("game_logs.moveModule_3"),
            "error",
        );
    }
};
