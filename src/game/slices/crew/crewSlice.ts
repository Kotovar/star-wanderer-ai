import type { GameState, GameStore } from "@/game/types/game";
import type { CrewMember } from "@/game/types";
import { gainExp as gainExpHelper } from "./helpers";

/**
 * Интерфейс CrewSlice
 * Содержит методы для управления опытом и уровнем экипажа
 */
export interface CrewSlice {
    /**
     * Начисляет опыт члену экипажа с учётом всех бонусов
     *
     * Учитывает:
     * - Расовые бонусы (например, человек: +15% к опыту)
     * - Бонусы от трейтов члена экипажа
     * - Бонусы от исследованных технологий (crew_exp)
     *
     * @param crewMember - Член экипажа для получения опыта (или undefined)
     * @param amount - Базовое количество опыта
     */
    gainExp: (crewMember: CrewMember | undefined, amount: number) => void;
}

/**
 * Создаёт слайс экипажа с поддержкой immer
 *
 * @param set - Функция для обновления состояния
 * @param get - Функция для получения текущего состояния
 * @returns Объект с методами управления экипажем
 */
export const createCrewSlice = (
    set: (fn: (state: GameState & CrewSlice) => void) => void,
    get: () => GameState & CrewSlice & GameStore,
): CrewSlice => ({
    gainExp: (crewMember, amount) => {
        const state = get();
        gainExpHelper(crewMember, amount, state, get(), set);
    },
});
