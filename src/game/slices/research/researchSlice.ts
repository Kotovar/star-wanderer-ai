import type { GameStore, SetState, TechnologyId } from "@/game/types";
import { startResearch as startResearchMethod } from "./methods/startResearch";
import { processResearch as processResearchMethod } from "./methods/processResearch";

/**
 * Интерфейс ResearchSlice
 * Содержит методы для управления системой научных исследований
 */
export interface ResearchSlice {
    /**
     * Запускает исследование технологии
     * @param techId - ID технологии для исследования
     */
    startResearch: (techId: TechnologyId) => void;

    /**
     * Обрабатывает исследование каждый ход
     */
    processResearch: () => void;
}

/**
 * Создаёт слайс исследований с поддержкой immer
 *
 * @param set - Функция для обновления состояния
 * @param get - Функция для получения текущего состояния
 * @returns Объект с методами управления исследованиями
 */
export const createResearchSlice = (
    set: SetState,
    get: () => GameStore,
): ResearchSlice => ({
    startResearch: (techId) => {
        startResearchMethod(techId, set, get);
    },

    processResearch: () => {
        processResearchMethod(set, get);
    },
});
