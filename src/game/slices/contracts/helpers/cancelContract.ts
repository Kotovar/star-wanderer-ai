import type { GameStore, SetState } from "@/game/types";
import { playSound } from "@/sounds";

/**
 * Отменяет контракт
 * @param contractId - ID контракта
 * @param set - Функция обновления состояния
 * @param get - Функция получения состояния
 */
export const cancelContract = (
    contractId: string,
    set: SetState,
    get: () => GameStore,
): void => {
    const contract = get().activeContracts.find((c) => c.id === contractId);
    if (!contract) return;

    if (contract.type === "delivery") {
        set((s) => ({
            ship: {
                ...s.ship,
                cargo: s.ship.cargo.filter((c) => c.contractId !== contractId),
            },
        }));
    }

    set((s) => ({
        activeContracts: s.activeContracts.filter((c) => c.id !== contractId),
    }));
    get().addLog(`Задача отменёна: ${contract.desc}`, "warning");
    playSound("error");
};
