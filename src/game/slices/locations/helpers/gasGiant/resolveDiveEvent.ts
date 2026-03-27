import type { SetState, GameStore } from "@/game/types";
import { RESEARCH_RESOURCES } from "@/game/constants";

const r = (min: number, max: number) =>
    Math.floor(Math.random() * (max - min + 1)) + min;

export function resolveDiveEvent(
    choiceIndex: number,
    set: SetState,
    get: () => GameStore,
): void {
    const state = get();
    const dive = state.activeDive;
    if (!dive || !dive.currentEvent) return;

    const choice = dive.currentEvent.choices[choiceIndex];
    if (!choice) return;

    // Apply ship damage if triggered
    if (
        choice.damageChance &&
        choice.damageMin !== undefined &&
        choice.damageMax !== undefined &&
        Math.random() * 100 < choice.damageChance
    ) {
        const damage = r(choice.damageMin, choice.damageMax);
        const aliveModules = state.ship.modules.filter((m) => m.health > 0);
        if (aliveModules.length > 0) {
            const target =
                aliveModules[Math.floor(Math.random() * aliveModules.length)];
            set((s) => ({
                ship: {
                    ...s.ship,
                    modules: s.ship.modules.map((m) =>
                        m.id === target.id
                            ? { ...m, health: Math.max(0, m.health - damage) }
                            : m,
                    ),
                },
            }));
            get().addLog(
                `⚡ Зонд получил урон: модуль «${target.name}» −${damage} HP`,
                "warning",
            );
        } else {
            set((s) => ({
                ship: { ...s.ship, armor: Math.max(0, s.ship.armor - damage) },
            }));
            get().addLog(`⚡ Корпус корабля получил урон: −${damage}`, "warning");
        }
    }

    // Check probe loss
    const probeLost =
        choice.probeLossChance !== undefined &&
        choice.probeLossChance > 0 &&
        Math.random() * 100 < choice.probeLossChance;

    // Accumulate rewards (even if probe is lost — partial loot is kept)
    const rewardDeltas = {
        alien_biology: 0,
        rare_minerals: 0,
        void_membrane: 0,
    };
    const logParts: string[] = [];

    for (const reward of choice.rewards) {
        const key = reward.type as keyof typeof rewardDeltas;
        if (key in rewardDeltas) {
            rewardDeltas[key] += reward.quantity;
        }
        const rd = RESEARCH_RESOURCES[reward.type];
        logParts.push(`${rd?.icon ?? ""} ${rd?.name ?? reward.type} ×${reward.quantity}`);
    }

    if (probeLost) {
        // Probe destroyed — wipe everything, no rewards applied
        set((s) => {
            if (!s.activeDive) return {};
            return {
                activeDive: {
                    ...s.activeDive,
                    rewards: { alien_biology: 0, rare_minerals: 0, void_membrane: 0 },
                    currentEvent: null,
                    finished: true,
                },
            };
        });
        get().addLog(
            "💥 Зонд уничтожен! Давление/разряд разрушили корпус. Все собранные данные потеряны.",
            "error",
        );
        return;
    }

    set((s) => {
        if (!s.activeDive) return {};
        return {
            activeDive: {
                ...s.activeDive,
                rewards: {
                    alien_biology:
                        s.activeDive.rewards.alien_biology +
                        rewardDeltas.alien_biology,
                    rare_minerals:
                        s.activeDive.rewards.rare_minerals +
                        rewardDeltas.rare_minerals,
                    void_membrane:
                        s.activeDive.rewards.void_membrane +
                        rewardDeltas.void_membrane,
                },
                currentEvent: null,
                finished: s.activeDive.currentDepth >= 4,
            },
        };
    });

    if (logParts.length > 0) {
        get().addLog(`📦 Получено: ${logParts.join(", ")}`, "info");
    }
}
