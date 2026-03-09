import type { GameState, GameStore } from "@/game/types";

/**
 * Обработка дезертирства экипажа
 */
export const processDesertion = (
    state: GameState,
    set: (fn: (s: GameState) => void) => void,
    get: () => GameStore,
): void => {
    set((s) => {
        const crewToKeep = s.crew.filter((c) => {
            if (c.race === "synthetic") return true;

            if (c.happiness <= 0) {
                const turnsAtZero = c.turnsAtZeroHappiness || 0;
                if (turnsAtZero >= 3) {
                    get().addLog(
                        `${c.name} покинул корабль из-за низкого настроения!`,
                        "warning",
                    );
                    return false;
                }
                return true;
            }
            return true;
        });

        const updatedCrew = crewToKeep.map((c) => ({
            ...c,
            turnsAtZeroHappiness:
                c.happiness <= 0
                    ? (c.turnsAtZeroHappiness || 0) + 1
                    : 0,
        }));

        return { crew: updatedCrew };
    });
};
