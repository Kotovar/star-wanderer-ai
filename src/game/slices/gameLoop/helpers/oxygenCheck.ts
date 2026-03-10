import { findActiveArtifact } from "@/game/artifacts";
import { ARTIFACT_TYPES, MIN_HEALTH_WITH_IMMORTALITY } from "@/game/constants";
import type { GameState, GameStore } from "@/game/types";
import { handleDeadCrew } from "./crewUtils";

// === Constants ===
const OXYGEN_DAMAGE_PERCENT = 20;

/**
 * Проверяет, есть ли активный артефакт бессмертия или ИИ управления
 */
const checkArtifacts = (state: GameState) => ({
    hasImmortality: !!(
        findActiveArtifact(state.artifacts, ARTIFACT_TYPES.IMMORTAL) ||
        findActiveArtifact(state.artifacts, ARTIFACT_TYPES.UNDYING)
    ),
    hasAIControl: !!findActiveArtifact(
        state.artifacts,
        ARTIFACT_TYPES.AI_NEURAL_LINK,
    ),
});

/**
 * Применяет урон от нехватки кислорода и логирует событие
 */
const applyOxygenDamage = (
    hasImmortality: boolean,
    crewCount: number,
    oxygenCapacity: number,
    set: (fn: (s: GameState) => void) => void,
    get: () => GameStore,
): void => {
    set((s) => ({
        crew: s.crew.map((c) => ({
            ...c,
            health: hasImmortality
                ? Math.max(
                      MIN_HEALTH_WITH_IMMORTALITY,
                      c.health - OXYGEN_DAMAGE_PERCENT,
                  )
                : c.health - OXYGEN_DAMAGE_PERCENT,
        })),
    }));

    get().addLog(
        `⚠️ НЕХВАТКА КИСЛОРОДА! Экипаж получил -${OXYGEN_DAMAGE_PERCENT}% урона (${crewCount}/${oxygenCapacity})`,
        "error",
    );
};

/**
 * Проверка кислорода на корабле
 *
 * При нехватке кислорода:
 * - Экипаж получает 20% урона
 * - С бессмертием: здоровье не опускается ниже 1
 * - Без бессмертия: экипаж может погибнуть
 * - При гибели всего экипажа без ИИ: конец игры
 *
 * @returns true если наступил конец игры
 */
export const checkOxygen = (
    state: GameState,
    get: () => GameStore,
    set: (fn: (s: GameState) => void) => void,
): boolean => {
    const crewCount = get().crew.length;
    const oxygenCapacity = get().getCrewCapacity();

    // Если кислорода достаточно — проверка не требуется
    if (crewCount <= oxygenCapacity) return false;

    const { hasImmortality, hasAIControl } = checkArtifacts(state);

    // Применение урона
    applyOxygenDamage(hasImmortality, crewCount, oxygenCapacity, set, get);

    // Обработка последствий
    if (hasImmortality) {
        get().addLog(
            "💖 Бессмертный экипаж выжил благодаря артефакту!",
            "info",
        );
        return false;
    }

    const { isGameOver } = handleDeadCrew(
        hasAIControl,
        (reason) => {
            get().addLog("💀 ВЕСЬ ЭКИПАЖ ПОГИБ! Игра окончена.", "error");
            set(() => ({
                gameOver: true,
                gameOverReason: `${reason} из-за нехватки кислорода`,
            }));
        },
        set,
        get,
    );

    return isGameOver;
};
