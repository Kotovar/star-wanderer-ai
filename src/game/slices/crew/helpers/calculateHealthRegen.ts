import type { CrewMember } from "@/game/types";
import { RACES } from "@/game/constants/races";

/**
 * Вычисляет пассивную регенерацию здоровья для члена экипажа за ход
 *
 * Формула:
 * - Базовая регенерация: 0 HP
 * - Бонус расы: human +5, xenosymbiont +10, krylorian +15
 * - Процентные бонусы от трейтов (например, "Регенерация" +50%)
 *
 * НЕ включает:
 * - Лечение от медика (назначение "heal")
 * - Лечение от медотсека (модуль "medical")
 * - Бонусы от сращивания ксеноморфа (применяются к модулям)
 *
 * @param crewMember - Член экипажа
 * @returns Количество HP для восстановления за ход (только пассивная регенерация)
 */
export const calculateHealthRegen = (crewMember: CrewMember): number => {
    const race = RACES[crewMember.race];

    // Базовая регенерация: 0 HP
    let regenAmount = 0;

    // Бонус расы (фиксированное число)
    const raceHealthBonus = race?.crewBonuses?.health || 0;
    regenAmount += raceHealthBonus;

    // Процентные бонусы от трейтов (например, "Регенерация" +50%)
    crewMember.traits.forEach((trait) => {
        if (trait.effect.regenBonus) {
            regenAmount = Math.floor(
                regenAmount * (1 + trait.effect.regenBonus),
            );
        }
    });

    return regenAmount;
};
