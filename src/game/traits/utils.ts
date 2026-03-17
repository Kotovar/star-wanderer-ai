import { CrewMember, RaceTrait, RaceTraitId } from "@/game/types";
import { RACES } from "@/game/constants";

type RaceTraitEffects = RaceTrait["effects"];

/**
 * Находит максимальный бонус от специального трейта среди членов экипажа
 *
 * @param crew - Массив членов экипажа
 * @param traitId - ID трейта для поиска (например, "resonance")
 * @param effectKey - Ключ эффекта для получения значения (например, "artifactBonus")
 * @returns Максимальное значение бонуса (0 если не найдено)
 */
export const getMaxCrewTraitBonus = <T extends keyof RaceTraitEffects>(
    crew: CrewMember[],
    traitId: RaceTraitId,
    effectKey: T,
): number => {
    let maxBonus = 0;

    crew.forEach((member) => {
        const race = RACES[member.race];
        if (race?.specialTraits) {
            const trait = race.specialTraits.find(
                (t) => t.id === traitId && t.effects[effectKey] !== undefined,
            );

            if (trait && trait.effects[effectKey]) {
                maxBonus = Math.max(maxBonus, trait.effects[effectKey]);
            }
        }
    });

    return maxBonus;
};
