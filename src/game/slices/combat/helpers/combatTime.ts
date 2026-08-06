import { store as i18nStore } from "@/lib/useTranslation";
import { checkModuleDamage } from "@/game/slices/gameLoop/helpers/moduleDamage";
import { processCrewAssignments } from "@/game/slices/gameLoop/processors";
import { runCrewAutomation } from "@/game/slices/crew/helpers/runCrewAutomation";
import type { GameState, GameStore, SetState } from "@/game/types";

type ImmerSetState = (fn: (state: GameState) => void) => void;

export function calculateCombatTimeCost(round: number): number {
    if (round <= 6) return 1;
    if (round <= 12) return 2;
    return 3;
}

export function advanceCombatRound(
    set: ImmerSetState,
    get: () => GameStore,
): void {
    set((s) => {
        if (!s.currentCombat) return;
        s.currentCombat.round = (s.currentCombat.round ?? 1) + 1;
    });

    runCrewAutomation(set as unknown as SetState, get);
    checkModuleDamage(get, set as unknown as SetState);
    processCrewAssignments(set as unknown as SetState, get);
    set((s) => {
        s.crew.forEach((crewMember) => {
            crewMember.movedThisTurn = false;
        });
    });
    get().updateShipStats();
    get().checkGameOver();
    get().saveGame();
}

export function applyCombatTimeCost(
    round: number,
    set: ImmerSetState,
    get: () => GameStore,
): void {
    const cost = calculateCombatTimeCost(round);

    set((s) => {
        s.turn += cost;
    });

    get().addLog( i18nStore.t("game_logs.combatTime_1", { round, cost }),
        "info",
    );
    get().saveGame();
}
