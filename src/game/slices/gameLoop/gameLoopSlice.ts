import type { GameState, GameStore } from "@/game/types";
import {
    initNewTurn,
    processPassiveExperience,
    checkOxygen,
    checkModuleDamage,
    managePower,
    regenerateShields,
} from "./helpers";
import * as processors from "./processors";

/**
 * Интерфейс GameLoopSlice
 */
export interface GameLoopSlice {
    nextTurn: () => void;
}

/**
 * Создаёт слайс игрового цикла
 */
export const createGameLoopSlice = (
    set: (fn: (state: GameState) => void) => void,
    get: () => GameStore,
): GameLoopSlice => ({
    nextTurn: () => {
        const state = get();

        // Инициализация нового хода
        initNewTurn(set);

        // Пассивный опыт каждые 5 ходов
        processPassiveExperience(state, get);

        // Удаление просроченных эффектов планеты
        get().removeExpiredEffects();
        get().updateShipStats();
        get().processResearch();

        // Проверка кислорода
        const gameOver = checkOxygen(state, get, set);
        if (gameOver) return;

        // Проверка повреждений модулей
        checkModuleDamage(state, get, set);

        // Управление энергией
        managePower(get, set);

        // Регенерация щитов
        regenerateShields(state, get, set);

        // Обработка проклятых артефактов
        processors.processCursedArtifacts(state, set, get);

        // Обработка мутаций
        processors.processMutations(state, set, get);

        // Дезертирство экипажа
        processors.processDesertion(set, get);

        // Путешествия
        processors.processTravel(state, set, get);

        // Случайные события
        processors.processRandomEvents(state, set, get);

        // Назначения экипажа
        processors.processCrewAssignments(set, get);

        // Трейты морали и прочее
        processors.processMoraleTraits(state, set, get);
        processors.processUnhappyCrew(state, set, get);
        processors.processPowerCheck(state, set, get);
        processors.processCursedArtifactEffects(state, set, get);
        processors.processArtifactBonuses(state, set, get);

        // Сохранение
        get().updateShipStats();
        get().saveGame();
    },
});
