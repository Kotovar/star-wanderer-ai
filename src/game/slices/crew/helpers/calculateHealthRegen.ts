import type { CrewMember, GameState } from "@/game/types";
import { RACES } from "@/game/constants/races";

/**
 * Вычисляет пассивную регенерацию здоровья для члена экипажа за ход
 *
 * Формула:
 * - Базовая регенерация: 0 HP
 * - Бонус расы: human +5, xenosymbiont +10, krylorian +15
 * - Процентные бонусы от трейтов (например, "Регенерация" +50%)
 * - Бонусы от активных эффектов (например, Биолаборатория +5)
 *
 * НЕ включает:
 * - Лечение от медика (назначение "heal")
 * - Лечение от медотсека (модуль "medical")
 * - Бонусы от сращивания ксеноморфа (применяются к модулям)
 *
 * @param crewMember - Член экипажа
 * @param state - Текущее состояние игры (для активных эффектов)
 * @returns Количество HP для восстановления за ход (только пассивная регенерация)
 */
export const calculateHealthRegen = (
    crewMember: CrewMember,
    state?: Pick<GameState, "activeEffects">,
): number => {
    const race = RACES[crewMember.race];

    // Базовая регенерация: 0 HP
    let regenAmount = 0;

    // Пассивная регенерация от расы (healthRegen)
    const raceHealthRegen = race?.crewBonuses?.healthRegen ?? 0;
    regenAmount += raceHealthRegen;

    // Процентные бонусы от трейтов (например, "Регенерация" +50%)
    crewMember.traits.forEach((trait) => {
        if (trait.effect.regenBonus) {
            regenAmount = Math.floor(regenAmount * (1 + trait.effect.regenBonus));
        }
        if (trait.effect.flatRegen) {
            regenAmount += trait.effect.flatRegen;
        }
    });

    // Бонусы от активных эффектов (например, Биолаборатория +5 HP за ход)
    if (state?.activeEffects) {
        state.activeEffects.forEach((effect) => {
            effect.effects.forEach((ef) => {
                if (
                    ef.type === "health_regen" &&
                    typeof ef.value === "number"
                ) {
                    regenAmount += ef.value;
                }
            });
        });
    }

    return regenAmount;
};
