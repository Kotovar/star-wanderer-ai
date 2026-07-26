import { store as i18nStore } from "@/lib/useTranslation";
import type { SetState, GameStore } from "@/game/types";

/**
 * Включает все вручную отключенные модули (например, после шторма).
 * Модули, отключенные из-за нехватки энергии, остаются под управлением
 * автоматики питания (см. powerManagement.ts).
 */
export const enableAllModules = (
    set: SetState,
    get: () => GameStore,
): void => {
    const hadManuallyDisabled = get().ship.modules.some(
        (m) => m.manualDisabled,
    );
    if (!hadManuallyDisabled) return;

    set((s) => ({
        ship: {
            ...s.ship,
            modules: s.ship.modules.map((m) =>
                m.manualDisabled ? { ...m, manualDisabled: false } : m,
            ),
        },
    }));
    get().addLog(i18nStore.t("game_logs.enableAllModules"), "info");
    get().updateShipStats();
};
