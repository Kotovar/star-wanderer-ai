import { getCompletedVictoryObjective } from "@/game/constants/victoryObjectives";
import type { GameStore, SetState } from "@/game/types";
import { triggerVictory } from "./triggerVictory";

export const checkVictory = (set: SetState, get: () => GameStore): void => {
    const state = get();

    if (state.gameVictory || state.victoryTriggered) {
        return;
    }

    if (getCompletedVictoryObjective(state)) {
        triggerVictory(set, get);
    }
};
