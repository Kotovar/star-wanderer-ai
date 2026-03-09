import { findActiveArtifact } from "@/game/artifacts";
import { ARTIFACT_TYPES } from "@/game/constants";
import type { GameState, GameStore } from "@/game/types";

/**
 * Вычисляет количество членов экипажа
 *
 * @param get - Функция получения состояния
 * @returns Количество членов экипажа
 */
const getCrewCount = (get: () => GameStore) => get().crew.length;

/**
 * Проверяет, есть ли активный артефакт бессмертия
 *
 * @param state - Текущее состояние игры
 * @returns true если есть активный артефакт бессмертия
 */
const hasImmortalityArtifact = (state: GameState): boolean => {
    const immortalArtifact = findActiveArtifact(
        state.artifacts,
        ARTIFACT_TYPES.IMMORTAL,
    );

    const undyingArtifact = findActiveArtifact(
        state.artifacts,
        ARTIFACT_TYPES.UNDYING,
    );

    return !!(immortalArtifact || undyingArtifact);
};

/**
 * Проверяет, есть ли активный артефакт ИИ управления
 *
 * @param state - Текущее состояние игры
 * @returns true если ИИ может управлять кораблём
 */
const hasAIControlArtifact = (state: GameState) =>
    !!findActiveArtifact(state.artifacts, ARTIFACT_TYPES.AI_NEURAL_LINK);

/**
 * Применяет урон от нехватки кислорода всему экипажу
 *
 * @param hasImmortality - Есть ли бессмертие у экипажа
 * @param damagePercent - Процент урона
 * @param set - Функция обновления состояния
 */
const applyOxygenDamage = (
    hasImmortality: boolean,
    damagePercent: number,
    set: (fn: (s: GameState) => void) => void,
): void => {
    set((s) => ({
        crew: s.crew.map((c) => ({
            ...c,
            health: hasImmortality
                ? Math.max(1, c.health - damagePercent)
                : c.health - damagePercent,
        })),
    }));
};

/**
 * Логирует урон от нехватки кислорода
 *
 * @param crewCount - Количество экипажа
 * @param oxygenCapacity - Вместимость кислорода
 * @param damagePercent - Процент урона
 * @param get - Функция получения состояния
 */
const logOxygenDamage = (
    crewCount: number,
    oxygenCapacity: number,
    damagePercent: number,
    get: () => GameStore,
): void => {
    get().addLog(
        `⚠️ НЕХВАТКА КИСЛОРОДА! Экипаж получил -${damagePercent}% урона (${crewCount}/${oxygenCapacity})`,
        "error",
    );
};

/**
 * Удаляет погибший экипаж из списка
 *
 * @param set - Функция обновления состояния
 */
const removeDeadCrew = (set: (fn: (s: GameState) => void) => void): void => {
    set((s) => ({
        crew: s.crew.filter((c) => c.health > 0),
    }));
};

/**
 * Проверяет, погиб ли весь экипаж, и обрабатывает конец игры
 *
 * @param hasAIArtifact - Есть ли ИИ управление
 * @param get - Функция получения состояния
 * @param set - Функция обновления состояния
 * @returns true если весь экипаж погиб и нет ИИ управления
 */
const checkTotalCrewLoss = (
    hasAIArtifact: boolean,
    get: () => GameStore,
    set: (fn: (s: GameState) => void) => void,
): boolean => {
    if (get().crew.length > 0) return false;

    if (hasAIArtifact) {
        get().addLog(
            "💀 ВЕСЬ ЭКИПАЖ ПОГИБ! Но ИИ Нейросеть управляет кораблём.",
            "warning",
        );
        return false;
    }

    get().addLog("💀 ВЕСЬ ЭКИПАЖ ПОГИБ! Игра окончена.", "error");
    set(() => ({
        gameOver: true,
        gameOverReason: "Экипаж погиб из-за нехватки кислорода",
    }));

    return true;
};

/**
 * Логирует выживание экипажа благодаря бессмертию
 *
 * @param get - Функция получения состояния
 */
const logImmortalitySurvival = (get: () => GameStore): void => {
    get().addLog("💖 Бессмертный экипаж выжил благодаря артефакту!", "info");
};

/**
 * Проверка кислорода на корабле
 *
 * Проверяет, достаточно ли кислорода для текущего экипажа.
 * При нехватке:
 * - Весь экипаж получает 20% урона
 * - При отсутствии бессмертия - экипаж может погибнуть
 * - При гибели всего экипажа и отсутствии ИИ - конец игры
 *
 * @param state - Текущее состояние игры
 * @param get - Функция получения состояния
 * @param set - Функция обновления состояния
 * @returns true если наступил конец игры, false если всё в порядке
 *
 * @example
 * ```ts
 * // В gameLoopSlice
 * const gameOver = checkOxygen(state, get, set);
 * if (gameOver) return;
 * ```
 */
export const checkOxygen = (
    state: GameState,
    get: () => GameStore,
    set: (fn: (s: GameState) => void) => void,
): boolean => {
    const crewCount = getCrewCount(get);
    const oxygenCapacity = get().getCrewCapacity();

    // Если кислорода достаточно - проверка не требуется
    if (crewCount <= oxygenCapacity) {
        return false;
    }

    // === Проверка артефактов ===
    const hasImmortality = hasImmortalityArtifact(state);
    const hasAIArtifact = hasAIControlArtifact(state);

    // === Применение урона ===
    const damagePercent = 20;
    applyOxygenDamage(hasImmortality, damagePercent, set);
    logOxygenDamage(crewCount, oxygenCapacity, damagePercent, get);

    // === Обработка последствий ===
    if (!hasImmortality) {
        removeDeadCrew(set);

        // Проверка на полную гибель экипажа
        const isGameOver = checkTotalCrewLoss(hasAIArtifact, get, set);
        if (isGameOver) {
            return true;
        }
    } else {
        logImmortalitySurvival(get);
    }

    return false;
};
