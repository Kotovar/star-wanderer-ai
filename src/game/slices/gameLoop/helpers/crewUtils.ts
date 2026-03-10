import type { GameState, GameStore } from "@/game/types";

/**
 * Результат обработки погибшего экипажа
 */
interface DeadCrewResult {
    /** Количество погибших */
    deadCount: number;
    /** Игра окончена */
    isGameOver: boolean;
}

/**
 * Удаляет погибший экипаж и проверяет конец игры
 *
 * @param hasAIControl - Есть ли ИИ управление (позволяет продолжить без экипажа)
 * @param onGameOver - Callback при конце игры
 * @param set - Функция обновления состояния
 * @param get - Функция получения состояния
 * @returns Результат обработки
 */
export const handleDeadCrew = (
    hasAIControl: boolean,
    onGameOver: (reason: string) => void,
    set: (fn: (s: GameState) => void) => void,
    get: () => GameStore,
): DeadCrewResult => {
    const deadCrew = get().crew.filter((c) => c.health <= 0);

    if (deadCrew.length === 0) {
        return { deadCount: 0, isGameOver: false };
    }

    // Логируем погибших
    get().addLog(
        `☠️ Погибли: ${deadCrew.map((c) => c.name).join(", ")}`,
        "error",
    );

    // Удаляем погибших
    set((s) => ({
        crew: s.crew.filter((c) => c.health > 0),
    }));

    // Проверяем, остался ли экипаж
    if (get().crew.length === 0) {
        if (hasAIControl) {
            get().addLog(
                "💀 ВЕСЬ ЭКИПАЖ ПОГИБ! Но ИИ управляет кораблём.",
                "warning",
            );
            return { deadCount: deadCrew.length, isGameOver: false };
        }

        onGameOver("Экипаж погиб");
        return { deadCount: deadCrew.length, isGameOver: true };
    }

    return { deadCount: deadCrew.length, isGameOver: false };
};

/**
 * Удаляет погибший экипаж без проверки конца игры
 *
 * @param set - Функция обновления состояния
 * @param get - Функция получения состояния
 * @returns Количество погибших
 */
export const removeDeadCrew = (
    set: (fn: (s: GameState) => void) => void,
    get: () => GameStore,
): number => {
    const deadCrew = get().crew.filter((c) => c.health <= 0);

    if (deadCrew.length === 0) return 0;

    set((s) => ({
        crew: s.crew.filter((c) => c.health > 0),
    }));

    get().addLog(
        `☠️ Погибли: ${deadCrew.map((c) => c.name).join(", ")}`,
        "error",
    );

    return deadCrew.length;
};
