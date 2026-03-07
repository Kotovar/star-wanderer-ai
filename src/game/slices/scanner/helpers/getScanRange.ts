import { RACES, RESEARCH_TREE } from "@/game/constants";
import { getArtifactEffectValue } from "@/game/artifacts";
import type { GameState } from "@/game/types";
import { getActiveModules } from "@/lib";

/**
 * Вычисляет диапазон сканирования корабля
 *
 * Возвращает числовое значение диапазона сканирования со всеми бонусами
 * Учитывает:
 * - Модули сканеров (должны быть активны и не повреждены)
 * - Артефакт "quantum_scan" - даёт +5 к range (требует модуль сканера)
 * - Технологии на scan_range
 * - Расовый бонус "resonance" (кристаллический резонанс) - увеличивает artifact effects
 *
 * @param state - Текущее состояние игры
 * @returns Диапазон сканирования (0 если нет сканеров)
 */
export function getScanRange(state: GameState): number {
    const scanners = getActiveModules(state.ship.modules, "scanner");
    if (scanners.length === 0) return 0;

    // Return the numeric scanRange value with all bonuses
    let maxRange = Math.max(...scanners.map((s) => s.scanRange || 0));

    // Apply quantum_scanner artifact bonus (+5 scan range) - requires scanner module
    const quantumScanner = state.artifacts.find(
        (a) => a.effect.type === "quantum_scan" && a.effect.active,
    );
    if (quantumScanner && scanners.length > 0) {
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
