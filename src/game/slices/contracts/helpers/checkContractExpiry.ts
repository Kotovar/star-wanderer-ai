import { store as i18nStore } from "@/lib/useTranslation";
import type { GameStore, SetState } from "@/game/types";
import { toast } from "sonner";
import { isContractExpired } from "@/game/contracts/contractDeadline";
import { formatContractDescription } from "@/game/contracts/formatContractDescription";

/**
 * Проверяет просроченные контракты и применяет штраф к репутации рас.
 * Вызывается каждый ход в gameLoopSlice.nextTurn.
 */
export const checkContractExpiry = (
    set: SetState,
    get: () => GameStore,
): void => {
    const state = get();
    const currentTurn = state.turn;

    const expired = state.activeContracts.filter(
        (contract) => isContractExpired(contract, currentTurn),
    );

    if (expired.length === 0) return;

    set((s) => ({
        activeContracts: s.activeContracts.filter(
            (ac) => !expired.some((e) => e.id === ac.id),
        ),
        ship: {
            ...s.ship,
            cargo: s.ship.cargo.filter(
                (cargo) => !expired.some((contract) => contract.id === cargo.contractId),
            ),
        },
    }));

    expired.forEach((c) => {
        const description = formatContractDescription(
            c,
            i18nStore.t.bind(i18nStore),
        );
        get().addLog( i18nStore.t("game_logs.checkContractExpiry_1", { value: description }),
            "warning",
        );
        toast.warning(
            i18nStore.t("contracts.expired_toast", { contract: description }),
        );
        const issuerRace = c.requiredRace ?? c.sourceDominantRace;
        if (issuerRace) {
            get().changeReputation(issuerRace, c.isRaceQuest ? -10 : -2);
        }
    });
};
