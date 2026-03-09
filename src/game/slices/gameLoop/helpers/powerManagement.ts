import type { GameState, GameStore } from "@/game/types";
import { EMERGENCY_SHUTDOWN_DAMAGE } from "@/game/constants";
import type { PartialModuleType } from "@/game/types";

/**
 * Управление энергией корабля
 * Отключает модули при дефиците, включает при избытке
 */
export const managePower = (
    state: GameState,
    get: () => GameStore,
    set: (fn: (s: GameState) => void) => void,
): void => {
    const currentPower = get().getTotalPower();
    const currentConsumption = get().getTotalConsumption();
    const powerDeficit = currentConsumption - currentPower;

    if (powerDeficit > 0) {
        const currentStatePowerDeficit = get();
        const modulesByPriority: Array<{ type: PartialModuleType; name: string }> = [
            { type: "cargo", name: "Грузовой отсек" },
            { type: "fueltank", name: "Топливный бак" },
            { type: "scanner", name: "Сканер" },
            { type: "drill", name: "Бур" },
            { type: "weaponbay", name: "Оружейная палуба" },
            { type: "shield", name: "Генератор щита" },
            { type: "engine", name: "Двигатель" },
        ];

        let disabledCount = 0;
        const updatedModules = [...currentStatePowerDeficit.ship.modules];
        let deficit = powerDeficit;

        for (const priority of modulesByPriority) {
            if (deficit <= 0) break;

            const enabledModules = updatedModules.filter(
                (m) =>
                    m.type === priority.type &&
                    !m.disabled &&
                    m.health > 0,
            );

            for (const mod of enabledModules) {
                if (deficit <= 0) break;

                const powerSaved = mod.consumption || 0;
                if (powerSaved > 0) {
                    const moduleIndex = updatedModules.findIndex(
                        (m) => m.id === mod.id,
                    );
                    if (moduleIndex >= 0) {
                        const damage = Math.floor(
                            (mod.maxHealth || 100) * EMERGENCY_SHUTDOWN_DAMAGE,
                        );
                        updatedModules[moduleIndex] = {
                            ...mod,
                            disabled: true,
                            health: Math.max(0, mod.health - damage),
                        };
                        deficit -= powerSaved;
                        disabledCount++;
                        get().addLog(
                            `⚠️ ${priority.name} отключен (нехватка энергии, -${damage}❤️)`,
                            "warning",
                        );
                    }
                }
            }
        }

        if (disabledCount > 0) {
            set((s) => ({
                ship: {
                    ...s.ship,
                    modules: updatedModules,
                },
            }));
            get().updateShipStats();
            get().addLog(
                `⚡ Отключено модулей: ${disabledCount}. Доступно энергии: ${get().getTotalPower() - get().getTotalConsumption()}`,
                "warning",
            );
        } else {
            get().addLog(
                `⚡ КРИТИЧЕСКАЯ НЕХВАТКА ЭНЕРГИИ! Потребление: ${currentConsumption}, Генерация: ${currentPower}`,
                "error",
            );
        }
    } else {
        const currentStatePowerDeficit = get();
        const disabledModules = currentStatePowerDeficit.ship.modules.filter(
            (m) => m.disabled && m.health > 0,
        );

        if (disabledModules.length > 0) {
            const powerNeeded = disabledModules.reduce(
                (sum, m) => sum + (m.consumption || 0),
                0,
            );

            if (currentPower >= currentConsumption + powerNeeded) {
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
                get().updateShipStats();
                get().addLog(
                    `⚡ Включено модулей: ${disabledModules.length}. Баланс: ${get().getTotalPower() - get().getTotalConsumption()}`,
                    "info",
                );
            }
        }
    }
};
