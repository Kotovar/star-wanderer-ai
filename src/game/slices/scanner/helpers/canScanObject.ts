import { GameState, LocationType } from "@/game/types";
import { getEffectiveScanRange } from "./getEffectiveScanRange";
import { findActiveArtifact } from "@/game/artifacts";
import { ARTIFACT_TYPES } from "@/game/constants";

/**
 * Проверяет, может ли сканер обнаружить объекты определённого типа
 *
 * Пороги видимости по scanRange:
 * - scanRange >= 3: friendly_ship (уровень 1)
 * - scanRange >= 5: anomaly tier 1-2 (уровень 2)
 * - scanRange >= 8: enemy tier 1-3, boss (уровень 3)
 * - scanRange >= 15: anomaly tier 3-4 (уровень 4)
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

    const eyeOfSingularity = findActiveArtifact(
        state.artifacts,
        ARTIFACT_TYPES.EYE_OF_SINGULARITY,
    );

    const hasAllSeeing = !!eyeOfSingularity;

    switch (objectType) {
        case "friendly_ship":
        case "derelict_ship":
            // Tier 1 - requires scanRange >= 3
            return scanRange >= 3 || hasAllSeeing;

        case "enemy": {
            // Enemy threat levels:
            // Tier 1: scanRange >= 3
            // Tier 2: scanRange >= 5
            // Tier 3: scanRange >= 8
            const tier = objectTier ?? 1;
            if (tier === 1) return scanRange >= 3 || hasAllSeeing;
            if (tier === 2) return scanRange >= 5 || hasAllSeeing;
            if (tier === 3) return scanRange >= 8 || hasAllSeeing;
            return scanRange >= 8 || hasAllSeeing; // Default to tier 3 requirement
        }

        case "boss":
            // Boss is tier 3 - requires scanRange >= 8
            return scanRange >= 8 || hasAllSeeing;

        case "anomaly": {
            // Anomaly tiers:
            // Tier 1: scanRange >= 3
            // Tier 2: scanRange >= 5
            // Tier 3: scanRange >= 8
            // Tier 4: scanRange >= 15
            const tier = objectTier ?? 1;
            if (tier === 1) return scanRange >= 3 || hasAllSeeing;
            if (tier === 2) return scanRange >= 5 || hasAllSeeing;
            if (tier === 3) return scanRange >= 8 || hasAllSeeing;
            if (tier === 4) return scanRange >= 15 || hasAllSeeing;
            return scanRange >= 3 || hasAllSeeing; // Default to tier 1 requirement
        }

        case "storm":
            // Storms require scanRange >= 5 to detect
            return scanRange >= 5 || hasAllSeeing;

        default:
            // Station, planet, asteroid_belt, distress_signal - always visible
            return true;
    }
};
