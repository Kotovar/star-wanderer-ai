import { RACES, RESEARCH_TREE } from "@/game/constants";
import { getArtifactEffectValue } from "@/game/artifacts";
import type { GameState, LocationType } from "@/game/types";
import { getActiveModules } from "@/lib";

/**
 * Вычисляет эффективный диапазон сканирования корабля
 *
 * Возвращает числовое значение диапазона сканирования со всеми бонусами
 * Учитывает:
 * - Модули сканеров (должны быть активны и не повреждены)
 * - Артефакт "quantum_scan" - даёт +5 к range (требует модуль сканера)
 * - Технологии на scan_range
 * - Расовый бонус "resonance" (кристаллический резонанс) - увеличивает artifact effects
 *
 * @param state - Текущее состояние игры
 * @returns Эффективный диапазон сканирования (0 если нет сканеров)
 */
export function getEffectiveScanRange(state: GameState): number {
    const scanners = getActiveModules(state.ship.modules, "scanner");
    if (scanners.length === 0) {
        // Check for all_seeing artifact (Eye of Singularity) - acts as scan range 8
        const allSeeing = state.artifacts.find(
            (a) => a.effect.type === "all_seeing" && a.effect.active,
        );
        if (allSeeing) {
            return 8; // Eye of Singularity gives scan range 8 (equivalent to scanner level 3)
        }
        return 0;
    }

    // Get the numeric scanRange value with all bonuses
    let maxRange = Math.max(...scanners.map((s) => s.scanRange || 0));

    // Apply quantum_scanner artifact bonus (+5 scan range) - requires scanner module
    const quantumScanner = state.artifacts.find(
        (a) => a.effect.type === "quantum_scan" && a.effect.active,
    );
    if (quantumScanner) {
        maxRange += getArtifactEffectValue(quantumScanner, state);
    }

    // Apply scan range technology bonuses
    const scanRangeTechs = state.research.researchedTechs.filter((techId) => {
        const tech = RESEARCH_TREE[techId];
        return tech.bonuses.some((b) => b.type === "scan_range");
    });
    let techScanRangeBonus = 0;
    scanRangeTechs.forEach((techId) => {
        const tech = RESEARCH_TREE[techId];
        tech.bonuses.forEach((bonus) => {
            if (bonus.type === "scan_range") {
                techScanRangeBonus = Math.max(techScanRangeBonus, bonus.value);
            }
        });
    });
    if (techScanRangeBonus > 0) {
        maxRange = Math.floor(maxRange * (1 + techScanRangeBonus));
    }

    // Apply crystalline artifactBonus (+15% to artifact effects)
    let artifactBonus = 0;
    state.crew.forEach((c) => {
        const race = RACES[c.race];
        if (race?.specialTraits) {
            const trait = race.specialTraits.find(
                (t) => t.id === "resonance" && t.effects.artifactBonus,
            );
            if (trait) {
                artifactBonus = Math.max(
                    artifactBonus,
                    trait.effects.artifactBonus as number,
                );
            }
        }
    });
    if (artifactBonus > 0 && quantumScanner) {
        maxRange = Math.floor(maxRange * (1 + artifactBonus));
    }

    return maxRange;
}

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
export function canScanObject(
    state: GameState,
    objectType: LocationType,
    objectTier?: number,
): boolean {
    const scanRange = getEffectiveScanRange(state);

    // Eye of Singularity - special case, acts as scanner level 3
    const allSeeing = state.artifacts.find(
        (a) => a.effect.type === "all_seeing" && a.effect.active,
    );
    const hasAllSeeing = !!allSeeing;

    switch (objectType) {
        case "friendly_ship":
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
}

/**
 * Вычисляет шанс раннего обнаружения засады
 *
 * @param scanRange - Эффективный диапазон сканирования
 * @param threatLevel - Уровень угрозы (enemy tier)
 * @returns Шанс обнаружения в процентах (0-100)
 */
export function getEarlyWarningChance(
    scanRange: number,
    threatLevel: number,
): number {
    // Base chance + bonus per point of scanRange above threshold
    // Tier 1 (threshold 3): Base 10% + 3% per point above 3
    // Tier 2 (threshold 5): Base 8% + 2.5% per point above 5
    // Tier 3 (threshold 8): Base 5% + 2% per point above 8
    const thresholds = [3, 5, 8];
    const baseChances = [10, 8, 5];
    const bonuses = [3, 2.5, 2];

    const tierIndex = Math.min(threatLevel - 1, 2);
    const threshold = thresholds[tierIndex];
    const baseChance = baseChances[tierIndex];
    const bonusPerPoint = bonuses[tierIndex];

    if (scanRange <= threshold) {
        return baseChance;
    }

    const bonus = (scanRange - threshold) * bonusPerPoint;
    return Math.min(80, baseChance + bonus);
}

/**
 * Вычисляет шанс раскрытия типа сигнала бедствия
 *
 * @param scanRange - Эффективный диапазон сканирования
 * @returns Шанс раскрытия в процентах (0-100)
 */
export function getSignalRevealChance(scanRange: number): number {
    if (scanRange < 3) return 0;

    // Base chances by scanRange thresholds:
    // scanRange >= 15: 75% (как scanner level 4)
    // scanRange >= 8: 50% (как scanner level 3)
    // scanRange >= 5: 30% (как scanner level 2)
    // scanRange >= 3: 15% (как scanner level 1)
    let baseChance = 0;
    let baseRequirement = 0;

    if (scanRange >= 15) {
        baseChance = 75;
        baseRequirement = 15;
    } else if (scanRange >= 8) {
        baseChance = 50;
        baseRequirement = 8;
    } else if (scanRange >= 5) {
        baseChance = 30;
        baseRequirement = 5;
    } else if (scanRange >= 3) {
        baseChance = 15;
        baseRequirement = 3;
    }

    // Bonus from numeric scanRange: +2% per point above base requirement
    if (scanRange > baseRequirement) {
        const rangeBonus = (scanRange - baseRequirement) * 2;
        return Math.min(95, baseChance + rangeBonus);
    }

    return baseChance;
}
