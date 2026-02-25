import type { GalaxyTier } from "../types";
import { LOCATION_COUNT } from "./config";

// ============================================================================
// Вспомогательные функции
// ============================================================================

/**
 * Генерирует угол для сектора на кольце
 */
export const calculateSectorAngle = (
    index: number,
    total: number,
    tier: GalaxyTier,
): number => {
    const baseAngle = (index / total) * Math.PI * 2;
    const offset = tier === 1 ? 0 : Math.PI / total;
    return baseAngle + offset;
};

/**
 * Генерирует радиус с небольшим разбросом
 */
export const calculateSectorRadius = (baseRadius: number): number => {
    const RADIUS_VARIATION = 0.1;
    return baseRadius + (Math.random() - 0.5) * RADIUS_VARIATION;
};

/**
 * Определяет количество локаций для сектора
 */
export const getLocationCount = (
    tier: GalaxyTier,
    isBlackHole: boolean,
): number => {
    if (isBlackHole) {
        const { min, max } = LOCATION_COUNT.blackHole;
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    const config = LOCATION_COUNT[`tier${tier}`];
    const { min, max } = config;
    return Math.floor(Math.random() * (max - min + 1)) + min;
};
