import type {
    ContractCompletionResult,
    GameState,
    GameStore,
    SetState,
} from "@/game/types";

export interface PatrolContractResult {
    newActiveContracts: GameState["activeContracts"];
    completedIds: string[];
    totalReward: number;
    completions: ContractCompletionResult[];
}

export const applyPatrolContractCompletions = (
    patrolResult: PatrolContractResult,
    set: SetState,
    get: () => GameStore,
): void => {
    set((state) => ({
        credits: state.credits + patrolResult.totalReward,
        completedContractIds: [
            ...state.completedContractIds,
            ...patrolResult.completedIds,
        ],
        activeContracts: patrolResult.newActiveContracts,
    }));

    patrolResult.completions.forEach((completion) => {
        get().showContractCompletion(completion);
    });
};
