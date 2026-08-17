import { store as i18nStore } from "@/lib/useTranslation";
import type { GameStore, SetState } from "@/game/types";
import { playSound } from "@/sounds";
import { formatContractDescription } from "@/game/contracts/formatContractDescription";
import { removeContractCargo } from "@/game/contracts/contractCargo";

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

    set((s) => ({
        ...removeContractCargo(s.ship, s.outposts, new Set([contractId])),
        activeContracts: s.activeContracts.filter((c) => c.id !== contractId),
    }));
    get().addLog( i18nStore.t("game_logs.cancelContract_1", {
        value: formatContractDescription(contract, i18nStore.t.bind(i18nStore)),
    }), "warning");

    if (contract.isRaceQuest && contract.requiredRace) {
        get().changeReputation(contract.requiredRace, -5);
    }

    playSound("ui_cancel");
};
