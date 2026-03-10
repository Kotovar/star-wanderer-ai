import type { GameState, GameStore } from "@/game/types";

// Constants
const EVENT_TRIGGER_CHANCE = 0.3;
const EVENT_COOLDOWN = 3;

// Storm event constants
const STORM_DAMAGE_MIN = 5;
const STORM_DAMAGE_MAX = 15;
const MIN_MODULE_HEALTH = 10;

// Capsule event constants
const CAPSULE_REWARDS_MIN = 20;
const CAPSULE_REWARDS_MAX = 30;

// Virus event constants
const VIRUS_HAPPINESS_PENALTY = 10;

interface RandomEvent {
    name: string;
    effect: (
        state: GameState,
        set: (fn: (s: GameState) => void) => void,
        get: () => GameStore,
    ) => void;
}

/**
 * Helper to get random integer in range [min, max]
 */
const randomInRange = (min: number, max: number): number =>
    Math.floor(Math.random() * (max - min + 1)) + min;

/**
 * Helper to get random element from array
 */
const randomElement = <T>(arr: T[]): T => arr[randomInRange(0, arr.length - 1)];

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
        Math.random() >= EVENT_TRIGGER_CHANCE
    ) {
        return;
    }

    const events: RandomEvent[] = [
        {
            name: "Космический шторм",
            effect: (_, setState, getState) => {
                const damage = randomInRange(
                    STORM_DAMAGE_MIN,
                    STORM_DAMAGE_MAX,
                );
                const modules = getState().ship.modules;
                const targetModule = randomElement(modules);

                setState((s) => ({
                    ship: {
                        ...s.ship,
                        modules: s.ship.modules.map((m) =>
                            m.id === targetModule.id
                                ? {
                                      ...m,
                                      health: Math.max(
                                          MIN_MODULE_HEALTH,
                                          m.health - damage,
                                      ),
                                  }
                                : m,
                        ),
                    },
                }));
                getState().addLog(
                    `Шторм! Модули повреждены: -${damage}%`,
                    "warning",
                );
            },
        },
        {
            name: "Капсула",
            effect: (_, setState, getState) => {
                const reward = randomInRange(
                    CAPSULE_REWARDS_MIN,
                    CAPSULE_REWARDS_MAX,
                );
                setState((s) => ({ credits: s.credits + reward }));
                getState().addLog(`Найдена капсула! +${reward}₢`, "info");
            },
        },
        {
            name: "Вирус",
            effect: (_, setState, getState) => {
                setState((s) => ({
                    crew: s.crew.map((c) => ({
                        ...c,
                        happiness: Math.max(
                            0,
                            c.happiness - VIRUS_HAPPINESS_PENALTY,
                        ),
                    })),
                }));
                getState().addLog("Вирус! Настроение команды -10", "error");
            },
        },
    ];

    const event = randomElement(events);
    event.effect(state, set, get);
    set(() => ({ randomEventCooldown: EVENT_COOLDOWN }));
};
