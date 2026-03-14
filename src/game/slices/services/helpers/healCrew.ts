import { RACES } from "@/game/constants/races";
import { HEAL_CONFIG } from "../constants";
import { calculateHealCost } from "./calculateHealCost";
import { playSound } from "@/sounds";
import type { ServiceCostResult } from "./types";
import type { GameStore, SetState } from "@/game/types";

/**
 * Выполняет лечение экипажа
 * @param set - Функция обновления состояния
 * @param get - Функция получения состояния
 */
export const healCrew = (set: SetState, get: () => GameStore): void => {
    const state = get();
    const { cost, canUse }: ServiceCostResult = calculateHealCost(state);

    // Проверка возможности лечения
    if (!canUse) {
        get().addLog("services.not_needed_heal", "warning");
        return;
    }

    // Проверка кредитов
    if (state.credits < cost) {
        get().addLog("Недостаточно кредитов!", "error");
        return;
    }

    // Лечение экипажа
    set((s) => ({
        credits: s.credits - cost,
        crew: s.crew.map((c) => ({
            ...c,
            health: c.maxHealth || HEAL_CONFIG.healthPercent,
            // Повышаем настроение только расам с настроением
            ...(RACES[c.race]?.hasHappiness
                ? {
                      happiness: Math.min(
                          c.maxHappiness || HEAL_CONFIG.healthPercent,
                          c.happiness + HEAL_CONFIG.happinessBonus,
                      ),
                  }
                : {}),
        })),
    }));

    get().addLog(`Экипаж вылечен за ${cost}₢`, "info");
    playSound("heal");
};
