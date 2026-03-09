import type { GameState, GameStore } from "@/game/types";

/**
 * Обработка мутаций экипажа
 */
export const processMutations = (
    state: GameState,
    set: (fn: (s: GameState) => void) => void,
    get: () => GameStore,
): void => {
    state.crew.forEach((crewMember) => {
        crewMember.traits.forEach((mutation) => {
            const isNightmares = mutation.name.includes("Кошмары");
            const isParanoid = mutation.name.includes("Паранойя");
            const isUnstable = mutation.name.includes("Нестабильность");

            if (isNightmares) {
                set((s) => ({
                    crew: s.crew.map((c) =>
                        c.id === crewMember.id
                            ? {
                                  ...c,
                                  happiness: Math.max(0, c.happiness - 10),
                              }
                            : c,
                    ),
                }));
                get().addLog(
                    `⚠️ ${crewMember.name}: Мутация Кошмары -10 счастья`,
                    "warning",
                );
            }
            if (isParanoid) {
                set((s) => ({
                    crew: s.crew.map((c) =>
                        c.id === crewMember.id
                            ? {
                                  ...c,
                                  happiness: Math.max(0, c.happiness - 15),
                              }
                            : c,
                    ),
                }));
                get().addLog(
                    `⚠️ ${crewMember.name}: Мутация Паранойя -15 счастья`,
                    "warning",
                );
            }
            if (isUnstable) {
                const randomChange = Math.floor(Math.random() * 31) - 20;
                set((s) => ({
                    crew: s.crew.map((c) =>
                        c.id === crewMember.id
                            ? {
                                  ...c,
                                  happiness: Math.max(
                                      0,
                                      Math.min(100, c.happiness + randomChange),
                                  ),
                              }
                            : c,
                    ),
                }));
                if (randomChange !== 0) {
                    get().addLog(
                        `⚠️ ${crewMember.name}: Мутация Нестабильность ${randomChange > 0 ? "+" : ""}${randomChange} счастья`,
                        randomChange < 0 ? "warning" : "info",
                    );
                }
            }
        });
    });
};
