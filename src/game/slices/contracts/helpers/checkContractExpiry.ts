import type { GameStore, SetState } from "@/game/types";
import { store as i18nStore } from "@/lib/useTranslation";

/**
 * Проверяет просроченные расовые контракты и применяет штраф к репутации.
 * Вызывается каждый ход в gameLoopSlice.nextTurn.
 */
export const checkContractExpiry = (
    set: SetState,
    get: () => GameStore,
): void => {
    const state = get();
    const currentTurn = state.turn;

    const expired = state.activeContracts.filter(
        (c) =>
            c.isRaceQuest &&
            c.requiredRace &&
            c.timeLimit !== undefined &&
            c.acceptedAt !== undefined &&
            currentTurn - c.acceptedAt >= c.timeLimit,
    );

    if (expired.length === 0) return;

    set((s) => ({
        activeContracts: s.activeContracts.filter(
            (ac) => !expired.some((e) => e.id === ac.id),
        ),
    }));

    expired.forEach((c) => {
        get().addLog(
            `⌛ Задание провалено: ${i18nStore.t(c.desc)} — время истекло`,
            "warning",
        );
        if (c.requiredRace) {
            get().changeReputation(c.requiredRace, -10);
        }
    });
};
