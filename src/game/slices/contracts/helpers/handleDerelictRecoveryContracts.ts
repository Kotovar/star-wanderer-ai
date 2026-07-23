import { store as i18nStore } from "@/lib/useTranslation";
import type { GameState, GameStore } from "@/game/types";

type SetState = {
    (partial: Partial<GameState> | ((state: GameState) => Partial<GameState>)): void;
};

export const handleDerelictRecoveryContracts = (
    locationId: string,
    set: SetState,
    get: () => GameStore,
): void => {
    const ready = get().activeContracts.filter(
        (contract) =>
            contract.type === "derelict_recovery" &&
            contract.targetLocationId === locationId,
    );
    if (ready.length === 0) return;

    const completedIds = new Set(ready.map((contract) => contract.id));
    const reward = ready.reduce(
        (total, contract) => total + (contract.reward ?? 0),
        0,
    );

    set((state) => ({
        credits: state.credits + reward,
        completedContractIds: [...state.completedContractIds, ...completedIds],
        activeContracts: state.activeContracts.filter(
            (contract) => !completedIds.has(contract.id),
        ),
    }));

    ready.forEach((contract) => {
        get().addLog(
            i18nStore.t("game_logs.completeDerelictRecoveryContracts_1", {
                reward: contract.reward,
            }),
            "info",
        );
        if (contract.sourceDominantRace) {
            get().changeReputation(contract.sourceDominantRace, 2);
        }
    });
};
