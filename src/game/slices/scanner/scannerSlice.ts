import type { GameState } from "@/game/types";
import { getScanLevel } from "./helpers/getScanLevel";
import { getScanRange } from "./helpers/getScanRange";

/**
 * Расширенный интерфейс ScannerSlice с геттерами
 * Содержит методы для вычисления характеристик сканера
 */
export interface ScannerSlice {
    /**
     * Вычисляет уровень сканера корабля
     * Определяет уровень (0-4) на основе максимального scanRange среди активных модулей
     * @returns Уровень сканера (0: нет сканера, 1-4: MK-1 до Quantum)
     */
    getScanLevel: () => number;

    /**
     * Вычисляет диапазон сканирования корабля
     * Возвращает числовое значение диапазона со всеми бонусами
     * @returns Диапазон сканирования (0 если нет сканеров)
     */
    getScanRange: () => number;
}

/**
 * Создаёт слайс сканера с поддержкой immer
 *
 * @param set - Функция для обновления состояния
 * @param get - Функция для получения текущего состояния
 * @returns Объект с методами вычисления характеристик сканера
 */
export const createScannerSlice = (
    set: (fn: (state: GameState & ScannerSlice) => void) => void,
    get: () => GameState & ScannerSlice,
): ScannerSlice => ({
    getScanLevel: () => {
        const state = get();
        return getScanLevel(state);
    },

    getScanRange: () => {
        const state = get();
        return getScanRange(state);
    },
});
