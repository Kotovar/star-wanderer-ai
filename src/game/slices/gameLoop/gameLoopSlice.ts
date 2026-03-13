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
import { processTravel } from "@/game/slices/travel/helpers";

/**
 * Интерфейс GameLoopSlice
 */
export interface GameLoopSlice {
    nextTurn: () => void;
    skipTurn: () => void;
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
        checkModuleDamage(get, set);

        // Управление энергией
        managePower(get, set);

        // Регенерация щитов
        regenerateShields(state, get, set);

        // Обработка проклятых артефактов
        processors.processCursedArtifacts(state, set, get);

        // Обработка положительных эффектов артефактов
        processors.processArtifactEffects(state, set, get);

        // Обработка мутаций
        processors.processMutations(state, set, get);

        // Дезертирство экипажа
        processors.processDesertion(set, get);

        // Проверка конца игры после ухода экипажа
        get().checkGameOver();

        // Путешествия
        processTravel(state, set, get);

        // Случайные события
        processors.processRandomEvents(state, set, get);

        // Назначения экипажа
        processors.processCrewAssignments(set, get);

        // Трейты морали и прочее
        processors.processMoraleTraits(set, get);
        processors.processUnhappyCrew(set, get);
        processors.processPowerCheck(set, get);

        // Сохранение
        get().updateShipStats();
        get().saveGame();
    },

    skipTurn: () => {
        get().addLog("Ход пропущен - задачи выполняются", "info");

        // Enemy attacks when we skip
        if (get().currentCombat) {
            get().processEnemyAttack();
            get().updateShipStats();
            get().checkGameOver();
        }

        get().nextTurn();
    },
});
