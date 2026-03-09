import type { GameState, GameStore } from "@/game/types";

/**
 * Проверка кислорода
 * При нехватке - экипаж получает урон, может погибнуть
 */
export const checkOxygen = (
    state: GameState,
    get: () => GameStore,
    set: (fn: (s: GameState) => void) => void,
): boolean => {
    const crewCount = get().crew.length;
    const oxygenCapacity = get().getCrewCapacity();

    if (crewCount <= oxygenCapacity) return false;

    const immortalArtifact = state.artifacts.find(
        (a) => a.effect.type === "crew_immortal" && a.effect.active,
    );
    const undyingArtifact = state.artifacts.find(
        (a) => a.effect.type === "undying_crew" && a.effect.active,
    );
    const hasImmortality = immortalArtifact || undyingArtifact;

    const hasAIArtifact = state.artifacts.some(
        (a) =>
            a.id === "ai_neural_link" &&
            !a.cursed &&
            a.effect.active,
    );

    const damagePercent = 20;
    set((s) => ({
        crew: s.crew.map((c) => ({
            ...c,
            health: hasImmortality
                ? Math.max(1, c.health - damagePercent)
                : c.health - damagePercent,
        })),
    }));
    get().addLog(
        `⚠️ НЕХВАТКА КИСЛОРОДА! Экипаж получил -${damagePercent}% урона (${crewCount}/${oxygenCapacity})`,
        "error",
    );

    if (!hasImmortality) {
        set((s) => ({
            crew: s.crew.filter((c) => c.health > 0),
        }));

        if (get().crew.length === 0) {
            if (hasAIArtifact) {
                get().addLog(
                    "💀 ВЕСЬ ЭКИПАЖ ПОГИБ! Но ИИ Нейросеть управляет кораблём.",
                    "warning",
                );
            } else {
                get().addLog(
                    "💀 ВЕСЬ ЭКИПАЖ ПОГИБ! Игра окончена.",
                    "error",
                );
                set(() => ({
                    gameOver: true,
                    gameOverReason: "Экипаж погиб из-за нехватки кислорода",
                }));
                return true;
            }
        }
    } else {
        get().addLog(
            "💖 Бессмертный экипаж выжил благодаря артефакту!",
            "info",
        );
    }

    return false;
};
