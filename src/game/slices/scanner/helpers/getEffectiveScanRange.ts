import { ARTIFACT_TYPES } from "@/game/constants";
import { findActiveArtifact, getArtifactEffectValue } from "@/game/artifacts";
import { getActiveModules } from "@/lib";
import { getMaxCrewTraitBonus } from "@/game/traits";
import { getTechBonusSum } from "@/game/research";
import type { GameState } from "@/game/types";

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
export const getEffectiveScanRange = (state: GameState) => {
    const scanners = getActiveModules(state.ship.modules, "scanner");
    if (scanners.length === 0) {
        const eyeOfSingularity = findActiveArtifact(
            state.artifacts,
            ARTIFACT_TYPES.EYE_OF_SINGULARITY,
        );

        if (eyeOfSingularity) {
            return eyeOfSingularity.scanRange ?? 0;
        }
        return 0;
    }

    let maxRange = Math.max(...scanners.map((s) => s.scanRange ?? 0));
    const quantumScanner = findActiveArtifact(
        state.artifacts,
        ARTIFACT_TYPES.QUANTUM_SCANNER,
    );

    if (quantumScanner) {
        maxRange += getArtifactEffectValue(quantumScanner, state);
    }

    // Применяем бонусы от исследованных технологий (плоские бонусы: +1, +2, +3)
    const techScanRangeBonus = getTechBonusSum(state.research, "scan_range");
    if (techScanRangeBonus > 0) {
        maxRange += techScanRangeBonus;
    }

    // Применяем бонус кристаллического артефакта (+15% к эффектам артефактов)
    // Применяется только к бонусу артефакта quantum_scanner, не к бонусам технологий
    const artifactBonus = getMaxCrewTraitBonus(
        state.crew,
        "resonance",
        "artifactBonus",
    );

    if (artifactBonus > 0 && quantumScanner) {
        const quantumBonus = getArtifactEffectValue(quantumScanner, state);
        maxRange += Math.floor(quantumBonus * artifactBonus);
    }

    return maxRange;
};
