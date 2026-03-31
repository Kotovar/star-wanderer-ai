import type { SetState, GameStore, Contract } from "@/game/types";
import { CONTRACT_REWARDS } from "@/game/constants";
import { giveCrewExperience } from "@/game/crew";

/**
 * Обрабатывает прогресс контракта на исследование аномалий
 *
 * @param contract - Контракт на исследование
 * @param set - Функция обновления состояния
 * @param get - Функция получения состояния
 * @returns true если контракт выполнен
 */
export const handleResearchContract = (
    contract: Contract,
    set: SetState,
    get: () => GameStore,
): boolean => {
    // Update contract progress
    set((s) => {
        const updated = s.activeContracts.map((c) =>
            c.id === contract.id
                ? {
                      ...c,
                      visitedAnomalies: (c.visitedAnomalies || 0) + 1,
                  }
                : c,
        );

        const updatedContract = updated.find((c) => c.id === contract.id);
        if (
            updatedContract &&
            updatedContract.visitedAnomalies !== undefined &&
            updatedContract.requiresAnomalies !== undefined &&
            updatedContract.visitedAnomalies >= updatedContract.requiresAnomalies
        ) {
            // Contract completed
            return {
                activeContracts: s.activeContracts.filter(
                    (ac) => ac.id !== contract.id,
                ),
                completedContractIds: [
                    ...s.completedContractIds,
                    contract.id,
                ],
                credits: s.credits + (contract.reward || 0),
            };
        }
        return { activeContracts: updated };
    });

    // Check if contract was completed
    const updatedContract = get().activeContracts.find(
        (c) => c.id === contract.id,
    );

    // If contract was removed (completed), show full progress; otherwise read updated value
    const currentProgress =
        updatedContract?.visitedAnomalies ?? contract.requiresAnomalies;

    get().addLog(
        `Исследование: ${currentProgress}/${contract.requiresAnomalies} аномалий`,
        "info",
    );

    if (!updatedContract) {
        // Contract completed - show completion message
        get().addLog(
            `Задача "${contract.desc}" выполнена! +${contract.reward}₢`,
            "info",
        );

        // Give experience to all crew members
        const expReward = CONTRACT_REWARDS.research.baseExp;
        giveCrewExperience(
            expReward,
            `Экипаж получил опыт: +${expReward} ед.`,
        );
        if (contract.sourceDominantRace) {
            get().changeReputation(contract.sourceDominantRace, 2);
        }
        return true;
    }

    return false;
};
