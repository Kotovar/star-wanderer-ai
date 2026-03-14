import type { GameState } from "@/game/types/game";
import type { LogEntry } from "@/game/types/logs";
import { playSound } from "@/sounds";
import { getMergeEffectsBonus } from "@/game/slices/crew/helpers";

/**
 * Заправляет корабль топливом
 *
 * @param state - Текущее состояние игры
 * @param amount - Количество топлива для заправки
 * @param price - Стоимость заправки в кредитах
 * @param addLog - Функция для добавления записи в бортжурнал
 * @param set - Функция для обновления состояния
 * @returns Объект с результатом заправки: успех, количество топлива, стоимость
 */
export const refuel = (
    state: GameState,
    amount: number,
    price: number,
    addLog: (message: string, type?: LogEntry["type"]) => void,
    set: (fn: (s: GameState) => Partial<GameState>) => void,
): { success: boolean; actualAmount: number } => {
    // Вычисляем бонус ёмкости от сращивания
    const mergeBonus = getMergeEffectsBonus(state.crew, state.ship.modules);
    let maxFuel = state.ship.maxFuel || 0;
    if (mergeBonus.fuelCapacity) {
        maxFuel = Math.floor(maxFuel * (1 + mergeBonus.fuelCapacity / 100));
    }

    const currentFuel = state.ship.fuel || 0;
    const spaceAvailable = maxFuel - currentFuel;
    const actualAmount = Math.min(amount, spaceAvailable);

    if (actualAmount <= 0) {
        addLog("Топливные баки полны!", "warning");
        return { success: false, actualAmount: 0 };
    }

    if (state.credits < price) {
        addLog("Недостаточно кредитов!", "error");
        return { success: false, actualAmount: 0 };
    }

    set((s) => ({
        credits: s.credits - price,
        ship: { ...s.ship, fuel: (s.ship.fuel || 0) + actualAmount },
    }));
    addLog(`Заправка: +${actualAmount} топлива за ${price}₢`, "info");
    playSound("energy");

    return { success: true, actualAmount };
};
