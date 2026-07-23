import { RACES } from "@/game/constants/races";
import { getTechBonusSum } from "@/game/research";
import type { CrewMember, ResearchData } from "@/game/types";

/**
 * Вычисляет множитель опыта для члена экипажа
 * (расовый трейт + личные черты + технологии crew_exp).
 * Единственная точка расчёта — UI и геймплей используют её же.
 *
 * @param crewMember - Член экипажа
 * @param research - Данные исследований (достаточно researchedTechs)
 * @returns Множитель опыта
 */
export const calculateExpMultiplier = (
    crewMember: CrewMember | undefined,
    research: Pick<ResearchData, "researchedTechs">,
): number => {
    if (!crewMember) return 1;

    let expMultiplier = 1;

    const race = RACES[crewMember.race];
    const expTrait = race?.specialTraits?.find((t) => t.effects?.expBonus);
    if (expTrait?.effects.expBonus) {
        expMultiplier += expTrait.effects.expBonus;
    }

    crewMember.traits?.forEach((trait) => {
        if (trait.effect?.expBonus) {
            expMultiplier += trait.effect.expBonus;
        }
    });

    // Apply crew_exp technology bonuses
    expMultiplier += getTechBonusSum(research, "crew_exp");

    return expMultiplier;
};
