import { CONTRACT_REWARDS } from "@/game/constants";
import { giveCrewExperience } from "@/game/crew";
import type { GameState, SetState, GameStore } from "@/game/types";

/**
 * Завершает выполненные контракты на сканирование
 * Вызывается при возврате на базовую планету после сканирования
 *
 * @param state - Текущее состояние игры
 * @param set - Функция обновления состояния
 * @param get - Функция получения состояния
 * @returns Объект с результатом завершения контрактов
 */
export const completeScanContracts = (
    state: GameState,
    set: SetState,
    get: () => GameStore,
) => {
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

    // Обновляем состояние для каждого завершённого контракта
    completed.forEach((contract) => {
        set((s) => ({
            credits: s.credits + contract.reward,
            completedContractIds: [...s.completedContractIds, contract.id],
            activeContracts: s.activeContracts.filter(
                (ac) => ac.id !== contract.id,
            ),
        }));

        get().addLog(
            `📡 Контракт выполнен: ${contract.desc} +${contract.reward}₢`,
            "info",
        );

        giveCrewExperience(
            contract.expReward,
            `Экипаж получил опыт: +${contract.expReward} ед.`,
        );
    });

    return {
        success: true,
        completed,
    };
};
