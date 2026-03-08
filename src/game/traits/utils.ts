import { CrewMember, MutationName, RaceTrait, RaceTraitId } from "@/game/types";
import { RACES } from "@/game/constants";

type RaceTraitEffects = RaceTrait["effects"];

export const getMutationTraitName = (type: MutationName): string => {
    const names: Record<MutationName, string> = {
        nightmares: "Мутация: Кошмары",
        paranoid: "Мутация: Паранойя",
        unstable: "Мутация: Нестабильность",
    };
    return names[type] || "Мутация";
};

export const getMutationTraitDesc = (type: MutationName): string => {
    const descs: Record<MutationName, string> = {
        nightmares: "-10 счастья каждый ход",
        paranoid: "-15 морали, +10% уклонение",
        unstable: "Случайные перепады настроения",
    };
    return descs[type] || "Неизвестная мутация";
};

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
