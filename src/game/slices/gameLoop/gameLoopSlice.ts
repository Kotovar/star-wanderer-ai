import type { GameStore, SetState } from "@/game/types";
import {
    initNewTurn,
    processPassiveExperience,
    checkOxygen,
    checkModuleDamage,
    managePower,
    regenerateShields,
    processNaniteRepair,
    processRepairBay,
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
    set: SetState,
    get: () => GameStore,
): GameLoopSlice => ({
    nextTurn: () => {
        const state = get();

        // Инициализация нового хода
        initNewTurn(set);

        // Сбрасываем bonusPower/bonusEvasion до значений из активных планетарных эффектов.
        // Это удаляет устаревшие накопленные значения от назначений экипажа
        // (экипажные бонусы теперь считаются динамически в getTotalPower/getTotalEvasion).
        const activeEffectsNow = get().activeEffects;
        const planetBonusPower = activeEffectsNow
            .flatMap((e) => e.effects)
            .filter((ef) => ef.type === "power_boost")
            .reduce((sum, ef) => sum + Number(ef.value), 0);
        const planetBonusEvasion = activeEffectsNow
            .flatMap((e) => e.effects)
            .filter((ef) => ef.type === "evasion_bonus")
            .reduce((sum, ef) => sum + Math.round(Number(ef.value) * 100), 0);
        set((s) => ({
            ship: {
                ...s.ship,
                bonusPower: planetBonusPower,
                bonusEvasion: planetBonusEvasion,
            },
        }));

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

        // Ремонт нанитами (automated_repair / nanite_hull)
        processNaniteRepair(get, set);

        // Ремонтные дроны (repair_bay модули)
        processRepairBay(get, set);

        // Обработка проклятых артефактов
        processors.processCursedArtifacts(state, set, get);

        // Обработка положительных эффектов артефактов
        processors.processArtifactEffects(state, set, get);

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
        processors.processOvercrowding(set, get);
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
