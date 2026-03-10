import {
    processCrewAssignments as processAssignments,
    processMedicalModule,
    processNegativeTraits,
} from "./crewAssignments";
import type { GameState, GameStore } from "@/game/types";

/**
 * Обрабатывает все аспекты экипажа:
 * - Назначения (ремонт, лечение, мораль, энергия)
 * - Боевые назначения
 * - Негативные трейты
 * - Пассивное лечение в медотсеке
 *
 * @param set - Функция обновления состояния
 * @param get - Функция получения состояния
 */
export const processCrewAssignments = (
    set: (fn: (s: GameState) => void) => void,
    get: () => GameStore,
): void => {
    // Обработка назначений (ремонт, лечение, мораль, и т.д.)
    processAssignments(set, get);

    // Пассивное лечение в медотсеке
    processMedicalModule(set, get);

    // Обработка негативных трейтов
    processNegativeTraits(set, get);
};
