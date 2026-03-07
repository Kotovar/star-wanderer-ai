import type { GameState, LocationType } from "@/game/types";
import {
    getEffectiveScanRange,
    canScanObject,
    getEarlyWarningChance,
    getSignalRevealChance,
} from "./helpers/getEffectiveScanRange";

/**
 * Расширенный интерфейс ScannerSlice с геттерами
 * Содержит методы для вычисления характеристик сканера
 */
export interface ScannerSlice {
    /**
     * Вычисляет эффективный диапазон сканирования корабля
     * Возвращает числовое значение диапазона со всеми бонусами
     * @returns Эффективный диапазон сканирования (0 если нет сканеров)
     */
    getEffectiveScanRange: () => number;

    /**
     * Проверяет, может ли сканер обнаружить объекты определённого типа
     * @param objectType - Тип объекта для проверки
     * @param objectTier - Уровень угрозы объекта (если применимо)
     * @returns true если объект может быть обнаружен
     */
    canScanObject: (objectType: LocationType, objectTier?: number) => boolean;

    /**
     * Вычисляет шанс раннего обнаружения засады
     * @param threatLevel - Уровень угрозы (enemy tier)
     * @returns Шанс обнаружения в процентах (0-100)
     */
    getEarlyWarningChance: (threatLevel: number) => number;

    /**
     * Вычисляет шанс раскрытия типа сигнала бедствия
     * @returns Шанс раскрытия в процентах (0-100)
     */
    getSignalRevealChance: () => number;
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
    getEffectiveScanRange: () => {
        const state = get();
        return getEffectiveScanRange(state);
    },

    canScanObject: (objectType, objectTier) => {
        const state = get();
        return canScanObject(state, objectType, objectTier);
    },

    getEarlyWarningChance: (threatLevel) => {
        const state = get();
        const scanRange = getEffectiveScanRange(state);
        return getEarlyWarningChance(scanRange, threatLevel);
    },

    getSignalRevealChance: () => {
        const state = get();
        const scanRange = getEffectiveScanRange(state);
        return getSignalRevealChance(scanRange);
    },
});
