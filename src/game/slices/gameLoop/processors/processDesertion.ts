import type { CrewMember, GameState, GameStore } from "@/game/types";

/**
 * Конфигурация дезертирства
 */
const TURNS_AT_ZERO_HAPPINESS = 3;

/**
 * Проверяет, должен ли член экипажа покинуть корабль
 */
const shouldDesert = (crewMember: CrewMember) => {
    // Синтетики не дезертируют
    if (crewMember.race === "synthetic") return false;

    // Проверяем счётчик при 0 счастья
    if (crewMember.happiness <= 0) {
        return (
            (crewMember.turnsAtZeroHappiness || 0) >= TURNS_AT_ZERO_HAPPINESS
        );
    }

    return false;
};

/**
 * Обновляет счётчик ходов при низком счастье
 */
const updateTurnsAtZeroHappiness = (crewMember: CrewMember): number => {
    if (crewMember.happiness <= 0) {
        return (crewMember.turnsAtZeroHappiness || 0) + 1;
    }
    return 0;
};

/**
 * Обработка дезертирства экипажа
 *
 * Механика:
 * - Если счастье ≤ 0, увеличивается счётчик turnsAtZeroHappiness
 * - При 3+ ходах с 0 счастьем член экипажа покидает корабль
 * - Синтетики иммунны к дезертирству
 *
 * @param set - Функция обновления состояния
 * @param get - Функция получения состояния
 */
export const processDesertion = (
    set: (fn: (s: GameState) => void) => void,
    get: () => GameStore,
): void => {
    set((s) => {
        // Фильтруем экипаж, оставляем только тех, кто не дезертировал
        const crewToKeep = s.crew.filter((crewMember) => {
            if (shouldDesert(crewMember)) {
                get().addLog(
                    `${crewMember.name} покинул корабль из-за низкого настроения!`,
                    "warning",
                );
                return false;
            }
            return true;
        });

        // Обновляем счётчики ходов при низком счастье
        const updatedCrew = crewToKeep.map((crewMember) => ({
            ...crewMember,
            turnsAtZeroHappiness: updateTurnsAtZeroHappiness(crewMember),
        }));

        return { crew: updatedCrew };
    });
};
