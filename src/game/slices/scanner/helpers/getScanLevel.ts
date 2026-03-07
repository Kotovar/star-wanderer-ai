import { RACES } from "@/game/constants";
import type { GameState } from "@/game/types";
import { getActiveModules } from "@/lib";

/**
 * Вычисляет уровень сканера корабля
 *
 * Определяет уровень сканера (0-4) на основе максимального scanRange среди активных модулей
 * Учитывает:
 * - Модули сканеров (должны быть активны и не повреждены)
 * - Артефакт "all_seeing" (Eye of Singularity) - даёт уровень 3 даже без модуля
 * - Расовый бонус "resonance" (кристаллический резонанс) - увеличивает range
 *
 * Уровни сканера:
 * - 0: Нет сканера
 * - 1: Scanner MK-1 (range >= 3)
 * - 2: Scanner MK-2 (range >= 5)
 * - 3: Scanner MK-3 (range >= 8) или Eye of Singularity
 * - 4: Quantum scanner (range >= 15)
 *
 * @param state - Текущее состояние игры
 * @returns Уровень сканера (0-4)
 */
export function getScanLevel(state: GameState): number {
    const scanners = getActiveModules(state.ship.modules, "scanner");

    // Apply all_seeing artifact (Eye of Singularity) - acts as scanner level 3
    // This works even without a scanner module
    const allSeeing = state.artifacts.find(
        (a) => a.effect.type === "all_seeing" && a.effect.active,
    );
    if (allSeeing) {
        return 3; // Eye of Singularity gives scanner level 3
    }

    if (scanners.length === 0) return 0;

    // Return the scanner level (1-4) based on scanRange
    let maxRange = Math.max(...scanners.map((s) => s.scanRange || 0));

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
    if (artifactBonus > 0) {
        maxRange = Math.floor(maxRange * (1 + artifactBonus));
    }

    if (maxRange >= 15) return 4; // Quantum scanner
    if (maxRange >= 8) return 3; // Scanner MK-3
    if (maxRange >= 5) return 2; // Scanner MK-2
    if (maxRange >= 3) return 1; // Scanner MK-1
    return 0;
}
