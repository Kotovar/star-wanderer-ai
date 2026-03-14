import type { SetState, GameStore } from "@/game/types";
import {
    ANOMALY_BASE_REWARD_PER_LEVEL,
    ANOMALY_RANDOM_REWARD_MAX,
    ANOMALY_BASE_DAMAGE_PER_LEVEL,
    ANOMALY_RANDOM_DAMAGE_MAX,
    ANOMALY_MIN_MODULE_HEALTH,
} from "../constants";
import { calculateScienceBonus } from "./calculateScienceBonus";
import { getCrewByProfession } from "@/game/crew";

/**
 * Применяет эффект аномалии (награда или урон)
 *
 * @param anomalyLevel - Уровень сложности аномалии
 * @param anomalyType - Тип аномалии ("good" или "bad")
 * @param set - Функция обновления состояния
 * @param get - Функция получения состояния
 */
export const applyAnomalyEffect = (
    anomalyLevel: number,
    anomalyType: string,
    set: SetState,
    get: () => GameStore,
): void => {
    const scientists = getCrewByProfession(get().crew, "scientist");
    const scienceBonus = calculateScienceBonus(scientists);
    const rewardMultiplier = 1 + scienceBonus;

    if (anomalyType === "good") {
        applyGoodAnomaly(anomalyLevel, rewardMultiplier, scienceBonus, set, get);
    } else {
        applyBadAnomaly(anomalyLevel, set, get);
    }
};

/**
 * Применяет эффект хорошей аномалии (денежная награда)
 */
const applyGoodAnomaly = (
    anomalyLevel: number,
    rewardMultiplier: number,
    scienceBonus: number,
    set: SetState,
    get: () => GameStore,
): void => {
    const randomBonus = Math.floor(Math.random() * ANOMALY_RANDOM_REWARD_MAX);
    const baseReward = ANOMALY_BASE_REWARD_PER_LEVEL * anomalyLevel;
    const reward = Math.floor((baseReward + randomBonus) * rewardMultiplier);

    set((s) => ({ credits: s.credits + reward }));

    const bonusText = scienceBonus > 0
        ? ` (бонус науки: +${Math.round(scienceBonus * 100)}%)`
        : "";

    get().addLog(`Аномалия: +${reward}₢${bonusText}`, "info");
};

/**
 * Применяет эффект плохой аномалии (повреждение случайного модуля)
 */
const applyBadAnomaly = (
    anomalyLevel: number,
    set: SetState,
    get: () => GameStore,
): void => {
    const state = get();
    const modules = state.ship.modules;

    if (modules.length === 0) return;

    const randomIndex = Math.floor(Math.random() * modules.length);
    const randomModule = modules[randomIndex];

    const randomDamage = Math.floor(Math.random() * ANOMALY_RANDOM_DAMAGE_MAX);
    const baseDamage = ANOMALY_BASE_DAMAGE_PER_LEVEL * anomalyLevel;
    const damage = baseDamage + randomDamage;

    set((s) => ({
        ship: {
            ...s.ship,
            modules: s.ship.modules.map((m) =>
                m.id === randomModule.id
                    ? {
                          ...m,
                          health: Math.max(ANOMALY_MIN_MODULE_HEALTH, m.health - damage),
                      }
                    : m,
            ),
        },
    }));

    get().addLog(`Аномалия: "${randomModule.name}" -${damage}%`, "warning");
};
