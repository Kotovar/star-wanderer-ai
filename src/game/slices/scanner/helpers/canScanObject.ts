import { GameState, LocationType } from "@/game/types";
import { canDetectObject, requiresScanner } from "./canDetectObject";
import { getEffectiveScanRange } from "./getEffectiveScanRange";

/**
 * Проверяет, может ли сканер обнаружить объекты определённого типа
 *
 * Пороги видимости по scanRange:
 * - scanRange >= 3: friendly/derelict ship, объекты 1 тира
 * - scanRange >= 5: объекты 2 тира, storm
 * - scanRange >= 8: объекты 3+ тира, boss
 * - scanRange >= 15: anomaly 4 тира
 *
 * @param state - Текущее состояние игры
 * @param objectType - Тип объекта для проверки
 * @param objectTier - Уровень угрозы объекта (если применимо)
 * @returns true если объект может быть обнаружен
 */
export const canScanObject = (
    state: GameState,
    objectType: LocationType,
    objectTier?: number,
) => {
    const scanRange = getEffectiveScanRange(state);
    return !requiresScanner(objectType) ||
        canDetectObject(objectType, scanRange, objectTier);
};
