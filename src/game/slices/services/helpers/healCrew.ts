import { store as i18nStore } from "@/lib/useTranslation";
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
    const raceId = state.currentLocation?.dominantRace;
    const { cost, canUse }: ServiceCostResult = calculateHealCost(
        state,
        raceId,
    );

    // Проверка возможности лечения
    if (!canUse) {
        get().addLog(i18nStore.t("services.not_needed"), "warning", "system");
        return;
    }

    // Проверка кредитов
    if (state.credits < cost) {
        get().addLog( i18nStore.t("game_logs.healCrew_1"), "error");
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

    get().addLog( i18nStore.t("game_logs.healCrew_2", { cost }), "info");
    playSound("world_heal");
};
