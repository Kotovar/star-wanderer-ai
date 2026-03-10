import { CONTRACT_REWARDS } from "@/game/constants";
import type { GameState } from "@/game/types";

/**
 * Завершает выполненные контракты на сканирование
 * Вызывается при возврате на базовую планету после сканирования
 *
 * @param state - Текущее состояние игры
 * @returns Объект с результатом завершения контрактов
 */
export const completeScanContracts = (state: GameState) => {
    const location = state.currentLocation;

    if (!location || location.type !== "planet") {
        return {
            success: false,
            message: "требуется посетить планету",
            completed: [],
        };
    }

    const scanComplete = state.activeContracts.filter(
        (c) =>
            c.type === "scan_planet" &&
            c.sourcePlanetId === location.id &&
            c.visited &&
            c.visited >= 1,
    );

    if (scanComplete.length === 0) {
        return {
            success: false,
            message: "нет завершённых контрактов",
            completed: [],
        };
    }

    const completed = scanComplete.map((c) => ({
        id: c.id,
        reward: c.reward || 0,
        desc: c.desc,
        expReward: CONTRACT_REWARDS.scan_planet.baseExp,
    }));

    return {
        success: true,
        completed,
    };
};
