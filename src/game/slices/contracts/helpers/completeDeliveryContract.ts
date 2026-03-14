import type { GameStore, SetState } from "@/game/types";
import { CONTRACT_REWARDS } from "@/game/constants";
import { giveCrewExperience } from "@/game/crew";
import { playSound } from "@/sounds";

/**
 * Выполняет контракт на доставку
 * @param contractId - ID контракта
 * @param set - Функция обновления состояния
 * @param get - Функция получения состояния
 */
export const completeDeliveryContract = (
    contractId: string,
    set: SetState,
    get: () => GameStore,
): void => {
    const contract = get().activeContracts.find((c) => c.id === contractId);
    if (!contract) return;

    set((s) => ({
        ship: {
            ...s.ship,
            cargo: s.ship.cargo.filter((c) => c.contractId !== contractId),
        },
        credits: s.credits + contract.reward,
        activeContracts: s.activeContracts.filter((c) => c.id !== contractId),
        completedContractIds: [...s.completedContractIds, contractId],
    }));
    get().addLog(`Задача выполнена! +${contract.reward}₢`, "info");

    // Give experience to all crew members
    const expReward = CONTRACT_REWARDS.delivery.baseExp;
    giveCrewExperience(expReward, `Экипаж получил опыт: +${expReward} ед.`);

    playSound("message");
};
