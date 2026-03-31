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
            c.visited !== undefined &&
            c.visited >= (c.requiresVisit ?? 1),
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
    scanComplete.forEach((c) => {
        const expReward = CONTRACT_REWARDS.scan_planet.baseExp;
        set((s) => ({
            credits: s.credits + (c.reward || 0),
            completedContractIds: [...s.completedContractIds, c.id],
            activeContracts: s.activeContracts.filter(
                (ac) => ac.id !== c.id,
            ),
        }));

        get().addLog(
            `📡 Контракт выполнен: ${c.desc} +${c.reward}₢`,
            "info",
        );

        giveCrewExperience(
            expReward,
            `Экипаж получил опыт: +${expReward} ед.`,
        );

        if (c.sourceDominantRace) {
            get().changeReputation(c.sourceDominantRace, 2);
        }
    });

    return {
        success: true,
        completed,
    };
};
