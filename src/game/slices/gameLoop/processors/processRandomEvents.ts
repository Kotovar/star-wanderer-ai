import type { GameState, GameStore } from "@/game/types";

/**
 * Обработка случайных событий
 */
export const processRandomEvents = (
    state: GameState,
    set: (fn: (s: GameState) => void) => void,
    get: () => GameStore,
): void => {
    if (
        state.currentCombat ||
        get().randomEventCooldown > 0 ||
        Math.random() >= 0.3
    )
        return;

    const events = [
        {
            name: "Космический шторм",
            effect: () => {
                const dmg = Math.floor(Math.random() * 15) + 5;
                set((s) => ({
                    ship: {
                        ...s.ship,
                        modules: s.ship.modules.map((m) =>
                            m.id ===
                            s.ship.modules[
                                Math.floor(
                                    Math.random() * s.ship.modules.length,
                                )
                            ].id
                                ? {
                                      ...m,
                                      health: Math.max(10, m.health - dmg),
                                  }
                                : m,
                        ),
                    },
                }));
                get().addLog(`Шторм! Модуль повреждён: -${dmg}%`, "warning");
            },
        },
        {
            name: "Капсула",
            effect: () => {
                const r = Math.floor(Math.random() * 30) + 20;
                set((s) => ({ credits: s.credits + r }));
                get().addLog(`Найдена капсула! +${r}₢`, "info");
            },
        },
        {
            name: "Вирус",
            effect: () => {
                set((s) => ({
                    crew: s.crew.map((c) => ({
                        ...c,
                        happiness: Math.max(0, c.happiness - 10),
                    })),
                }));
                get().addLog("Вирус! Настроение -10", "error");
            },
        },
    ];
    const event = events[Math.floor(Math.random() * events.length)];
    event.effect();
    set(() => ({ randomEventCooldown: 3 }));
};
