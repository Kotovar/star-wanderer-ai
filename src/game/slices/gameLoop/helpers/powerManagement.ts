import {
    DEFAULT_MAX_HEALTH_MODULE,
    EMERGENCY_SHUTDOWN_DAMAGE,
    MIN_MODULE_HEALTH,
    MODULES_BY_PRIOTITY,
} from "@/game/constants";
import type { GameState, GameStore, Module, SetState } from "@/game/types";
import { isModuleActive } from "@/game/modules/utils";

type SetStateFn = (fn: (s: GameState) => Partial<GameState>) => void;

interface PowerStatus {
    currentPower: number;
    currentConsumption: number;
    deficit: number;
}

/**
 * Получает текущий статус энергии
 */
const getPowerStatus = (get: () => GameStore): PowerStatus => {
    const currentPower = get().getTotalPower();
    const currentConsumption = get().getTotalConsumption();

    return {
        currentPower,
        currentConsumption,
        deficit: currentConsumption - currentPower,
    };
};

/**
 * Отключает модуль и наносит урон
 */
const disableModule = (
    module: Module,
    modules: Module[],
): { modules: Module[]; damage: number } => {
    const updatedModules = [...modules];
    const moduleIndex = updatedModules.findIndex((m) => m.id === module.id);

    if (moduleIndex < 0) {
        return { modules, damage: 0 };
    }

    const damage = Math.floor(
        (module.maxHealth || DEFAULT_MAX_HEALTH_MODULE) *
            EMERGENCY_SHUTDOWN_DAMAGE,
    );

    updatedModules[moduleIndex] = {
        ...module,
        disabled: true,
        health: Math.max(MIN_MODULE_HEALTH, module.health - damage),
    };

    return { modules: updatedModules, damage };
};

/**
 * Отключает модули при дефиците энергии
 */
const handlePowerDeficit = (
    deficit: number,
    get: () => GameStore,
    set: SetStateFn,
): void => {
    const modules = [...get().ship.modules];
    let remainingDeficit = deficit;
    let disabledCount = 0;

    for (const priority of MODULES_BY_PRIOTITY) {
        if (remainingDeficit <= 0) break;

        const enabledModules = modules.filter(
            (m) => m.type === priority.type && isModuleActive(m),
        );

        for (const mod of enabledModules) {
            if (remainingDeficit <= 0) break;

            const powerSaved = mod.consumption ?? 0;
            if (powerSaved <= 0) continue;

            const result = disableModule(mod, modules);
            if (result.damage > 0) {
                Object.assign(modules, result.modules);
                remainingDeficit -= powerSaved;
                disabledCount++;
                get().addLog(
                    `⚠️ ${priority.name} отключен (нехватка энергии, -${result.damage}❤️)`,
                    "warning",
                );
            }
        }
    }

    if (disabledCount > 0) {
        set((s) => ({
            ship: { ...s.ship, modules },
        }));
        get().updateShipStats();
        const { currentPower, currentConsumption } = getPowerStatus(get);
        get().addLog(
            `⚡ Отключено модулей: ${disabledCount}. Доступно энергии: ${currentPower - currentConsumption}`,
            "warning",
        );
    } else {
        const { currentPower, currentConsumption } = getPowerStatus(get);
        get().addLog(
            `⚡ КРИТИЧЕСКАЯ НЕХВАТКА ЭНЕРГИИ! Потребление: ${currentConsumption}, Генерация: ${currentPower}`,
            "error",
        );
    }
};

/**
 * Включает модули при избытке энергии
 */
const handlePowerSurplus = (get: () => GameStore, set: SetStateFn): void => {
    const disabledModules = get().ship.modules.filter(
        (m) => m.disabled && m.health > 0,
    );

    if (disabledModules.length === 0) return;

    const { currentPower, currentConsumption } = getPowerStatus(get);
    const powerNeeded = disabledModules.reduce(
        (sum, m) => sum + (m.consumption ?? 0),
        0,
    );

    if (currentPower < currentConsumption + powerNeeded) return;

    set((s) => ({
        ship: {
            ...s.ship,
            modules: s.ship.modules.map((m) =>
                m.disabled && m.health > 0 ? { ...m, disabled: false } : m,
            ),
        },
    }));
    get().updateShipStats();
    const { currentPower: newPower, currentConsumption: newConsumption } =
        getPowerStatus(get);
    get().addLog(
        `⚡ Включено модулей: ${disabledModules.length}. Баланс: ${newPower - newConsumption}`,
        "info",
    );
};

/**
 * Управление энергией корабля
 * Отключает модули при дефиците, включает при избытке
 */
export const managePower = (get: () => GameStore, set: SetState): void => {
    const { deficit } = getPowerStatus(get);

    if (deficit > 0) {
        handlePowerDeficit(deficit, get, set);
    } else {
        handlePowerSurplus(get, set);
    }
};
