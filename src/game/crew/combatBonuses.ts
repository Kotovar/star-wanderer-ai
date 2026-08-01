import { getAugmentationBonus } from "../constants/augmentations.ts";
import { COMBAT_ACCURACY_MODIFIERS } from "../constants/combat.ts";
import { getTechPerkValue } from "../constants/techTree.ts";
import type { CrewMember } from "../types/crew";

/** Личный вклад канонира в глобальную точность — используется сильнейший активный. */
export function getGunnerAccuracyBonus(crewMember: CrewMember): number {
    let bonus = Math.min(
        COMBAT_ACCURACY_MODIFIERS.GUNNER_LEVEL_MAX_BONUS,
        (crewMember.level || 1) * COMBAT_ACCURACY_MODIFIERS.GUNNER_LEVEL_BONUS,
    );
    crewMember.traits?.forEach((trait) => {
        if (trait.effect?.accuracyPenalty) bonus -= Number(trait.effect.accuracyPenalty);
        if (trait.effect?.accuracyBonus) bonus += Number(trait.effect.accuracyBonus);
    });
    return bonus +
        getAugmentationBonus(crewMember, "accuracyBonus") +
        getTechPerkValue(crewMember, "A");
}

/** Личный вклад канонира в глобальный крит — используется сильнейший активный. */
export function getGunnerCritBonus(crewMember: CrewMember): number {
    let bonus = getAugmentationBonus(crewMember, "critBonus");
    crewMember.traits?.forEach((trait) => {
        bonus += trait.effect?.critBonus ?? 0;
    });
    return bonus + getTechPerkValue(crewMember, "B");
}
