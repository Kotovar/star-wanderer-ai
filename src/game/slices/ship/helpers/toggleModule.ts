import type { SetState, GameStore } from "@/game/types";

/**
 * Включает/отключает модуль корабля
 *
 * @param moduleId - ID модуля для переключения
 * @param set - Функция обновления состояния
 * @param get - Функция получения состояния
 */
export const toggleModule = (
    moduleId: number,
    set: SetState,
    get: () => GameStore,
): void => {
    const state = get();
    const mod = state.ship.modules.find((m) => m.id === moduleId);
    if (!mod) return;

    const isDisabling = !mod.manualDisabled;

    if (isDisabling) {
        // Manual disable - no damage
        set((s) => ({
            ship: {
                ...s.ship,
                modules: s.ship.modules.map((m) =>
                    m.id === moduleId ? { ...m, manualDisabled: true } : m,
                ),
            },
        }));
        get().addLog(`Модуль "${mod.name}" отключён вручную`, "warning");
    } else {
        // Re-enabling module
        set((s) => ({
            ship: {
                ...s.ship,
                modules: s.ship.modules.map((m) =>
                    m.id === moduleId ? { ...m, manualDisabled: false } : m,
                ),
            },
        }));
        get().addLog(`Модуль "${mod.name}" включён`, "info");

        // Check if we now have enough power to re-enable auto-disabled modules
        const currentPower = get().getTotalPower();
        const currentConsumption = get().getTotalConsumption();
        const autoDisabledModules = get().ship.modules.filter(
            (m) => m.disabled && m.health > 0,
        );

        if (autoDisabledModules.length > 0) {
            const powerNeeded = autoDisabledModules.reduce(
                (sum, m) => sum + (m.consumption || 0),
                0,
            );

            if (currentPower >= currentConsumption + powerNeeded) {
                // We have enough power to re-enable all auto-disabled modules
                set((s) => ({
                    ship: {
                        ...s.ship,
                        modules: s.ship.modules.map((m) =>
                            m.disabled && m.health > 0
                                ? { ...m, disabled: false }
                                : m,
                        ),
                    },
                }));
                get().addLog(
                    `⚡ Включено модулей: ${autoDisabledModules.length}. Баланс: ${get().getTotalPower() - get().getTotalConsumption()}`,
                    "info",
                );
            }
        }
    }
    get().updateShipStats();
};
