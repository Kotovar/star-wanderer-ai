import { getRaceCrewBonus } from "@/game/races";
import {
    getStrongestRaceTechPerkValue,
    getTechPerkValue,
} from "@/game/constants/techTree";
import type { CrewMember, GameState } from "@/game/types";

/**
 * Вычисляет пассивную регенерацию здоровья для члена экипажа за ход
 *
 * Формула:
 * - Базовая регенерация: 0 HP
 * - Бонус расы: human +5, xenosymbiont +10
 * - Плоские бонусы трейтов (мутация "Клеточное восстановление" +5) и ветки
 *   "Биохимик" (медик), затем бонусы активных эффектов (Биолаборатория +5)
 * - И только в конце — проценты: трейт "Непобедимый" (+10%) и расовая
 *   ветка ксеносимбионта
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
    state?: Pick<GameState, "activeEffects"> & { crew?: CrewMember[] },
): number => {

    // Сначала складываем ВСЕ плоские источники, только потом множим на
    // проценты: иначе "+10% регенерации" Непобедимого умножало бы одну лишь
    // расовую регенерацию (у человека floor(5 * 1.1) = 5, то есть ноль), а
    // +5 HP мутации "Клеточное восстановление" не попадали бы под процент
    // вообще — мутации всегда идут в массиве трейтов после позитивных.
    let regenAmount = getRaceCrewBonus(crewMember.race, "healthRegen");

    let regenMultiplier = 1;
    crewMember.traits.forEach((trait) => {
        if (trait.effect.flatRegen) {
            regenAmount += trait.effect.flatRegen;
        }
        if (trait.effect.regenBonus) {
            regenMultiplier += trait.effect.regenBonus;
        }
    });

    // Ветка "Иммунолог" (медик): фиксированная пассивная регенерация
    if (crewMember.profession === "medic") {
        regenAmount += getTechPerkValue(crewMember, "B");
    }

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

    if (regenMultiplier !== 1) {
        regenAmount = Math.floor(regenAmount * regenMultiplier);
    }

    if (state?.crew) {
        const xenosymbiontBonus = getStrongestRaceTechPerkValue(
            state.crew,
            "xenosymbiont",
        );
        if (xenosymbiontBonus > 0) {
            regenAmount = Math.floor(regenAmount * (1 + xenosymbiontBonus));
        }
    }

    return regenAmount;
};
