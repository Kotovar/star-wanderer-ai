import type { GameStore, SetState } from "@/game/types";
import { playSound } from "@/sounds";
import { calculateRepairCost } from "./calculateRepairCost";
import { ServiceCostResult } from "./types";

/**
 * Выполняет ремонт корабля
 * @param set - Функция обновления состояния
 * @param get - Функция получения состояния
 */
export const repairShip = (set: SetState, get: () => GameStore): void => {
    const state = get();
    const { cost, canUse }: ServiceCostResult = calculateRepairCost(state);

    // Проверка возможности ремонта
    if (!canUse) {
        get().addLog("services.not_needed_repair", "warning");
        return;
    }

    // Проверка кредитов
    if (state.credits < cost) {
        get().addLog("Недостаточно кредитов!", "error");
        return;
    }

    // Ремонт всех модулей
    set((s) => ({
        credits: s.credits - cost,
        ship: {
            ...s.ship,
            modules: s.ship.modules.map((m) => ({
                ...m,
                health: m.maxHealth,
            })),
        },
    }));

    get().addLog(`Корабль отремонтирован за ${cost}₢`, "info");
    playSound("success");
    get().updateShipStats();
};
