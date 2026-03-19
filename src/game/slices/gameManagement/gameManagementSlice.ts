import type { GameStore, SetState } from "@/game/types";
import { checkGameOver, triggerVictory, restartGame } from "./helpers";
import { loadFromLocalStorage, saveToLocalStorage } from "@/game/saves/utils";
import { CREW_TRAITS } from "@/game/constants/traits";

/**
 * Интерфейс GameManagementSlice
 */
export interface GameManagementSlice {
    checkGameOver: () => void;
    triggerVictory: () => void;
    restartGame: () => void;
    saveGame: () => void;
    loadGame: () => boolean;
}

/**
 * Создаёт слайс управления игрой
 * @param set - Функция обновления состояния
 * @param get - Функция получения текущего состояния
 * @returns Методы управления игрой
 */
export const createGameManagementSlice = (
    set: SetState,
    get: () => GameStore,
): GameManagementSlice => ({
    checkGameOver: () => checkGameOver(set, get),
    triggerVictory: () => triggerVictory(set, get),
    restartGame: () => restartGame(set, get),

    /**
     * Сохраняет текущее состояние игры
     */
    saveGame: () => {
        const state = get();
        saveToLocalStorage(state);
        get().addLog("Игра сохранена", "info");
    },

    /**
     * Загружает сохранённое состояние игры
     * @returns true, если загрузка успешна, false если сохранений нет
     */
    loadGame: () => {
        const saved = loadFromLocalStorage();
        if (!saved) {
            get().addLog("Нет сохранённой игры", "warning");
            get().updateShipStats();
            return false;
        }

        // Миграция: добавляем настройки, если отсутствуют (для старых сохранений)
        if (!saved.settings) {
            saved.settings = { animationsEnabled: false };
        }

        // Миграция: добавляем счётчик загрузок, если отсутствует
        if (saved.gameLoadedCount === undefined) {
            saved.gameLoadedCount = 0;
        }

        // Увеличиваем счётчик загрузок для предотвращения повторного показа модальных окон
        saved.gameLoadedCount += 1;

        // Миграция: синхронизируем данные трейтов экипажа с актуальными константами
        const allTraits = Object.values(CREW_TRAITS).flat();
        saved.crew = saved.crew.map((c) => ({
            ...c,
            traits: c.traits?.map((t) => {
                const current = allTraits.find((d) => d.id === t.id);
                if (!current) return t;
                return { ...t, name: current.name, desc: current.desc, effect: current.effect };
            }),
        }));

        set({ ...saved });
        get().addLog("Игра загружена", "info");
        return true;
    },
});
