import type { GameState } from "@/game/types/game";
import { CREW_ASSIGNMENT_BONUSES, RACES } from "@/game/constants";

/**
 * Вычисляет общий шанс уклонения корабля
 *
 * Учитывает:
 * - Базовое уклонение от уровня пилота (3% за уровень)
 * - Бонус от боевой задачи "evasion" (+3% за уровень пилота)
 * - Бонусы от артефактов (например, Evasion Matrix)
 * - Бонусы от расовых трейтов (например, Krylorian intimidation)
 *
 * @param state - Текущее состояние игры
 * @returns Шанс уклонения в процентах
 */
export function getTotalEvasion(state: GameState): number {
    const { crew, artifacts } = state;
    const captain = crew.find((c) => c.profession === "pilot");
    const captainLevel = captain?.level ?? 1;

    // Базовое уклонение от уровня пилота
    let evasion = captainLevel * CREW_ASSIGNMENT_BONUSES.EVASION;

    // Бонус от боевой задачи "evasion" (только в бою)
    const hasCombatEvasion = crew.some((c) => c.combatAssignment === "evasion");
    if (hasCombatEvasion) {
        evasion += captainLevel * CREW_ASSIGNMENT_BONUSES.EVASION;
    }

    // Бонусы от артефактов
    artifacts.forEach((artifact) => {
        if (
            artifact.effect?.type === "evasion_boost" &&
            artifact.effect?.active
        ) {
            const value = Number(artifact.effect?.value || 0);
            evasion += value * 100; // Конвертируем в проценты (0.1 = 10%)
        }
    });

    // Бонусы от расовых трейтов (например, Krylorian intimidation)
    crew.forEach((c) => {
        const race = RACES[c.race];
        if (race?.specialTraits) {
            race.specialTraits.forEach((trait) => {
                if (trait.effects.evasionBonus) {
                    evasion += Number(trait.effects.evasionBonus) * 100;
                }
            });
        }
    });

    return Math.round(evasion);
}
