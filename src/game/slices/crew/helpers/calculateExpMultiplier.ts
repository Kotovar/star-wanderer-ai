import { RACES } from "@/game/constants/races";
import { RESEARCH_TREE } from "@/game/constants";
import type { CrewMember, GameState } from "@/game/types";

/**
 * Вычисляет множитель опыта для члена экипажа
 *
 * @param crewMember - Член экипажа
 * @param state - Текущее состояние игры
 * @returns Множитель опыта
 */
export const calculateExpMultiplier = (
    crewMember: CrewMember | undefined,
    state: GameState,
): number => {
    if (!crewMember) return 1;

    let expMultiplier = 1;

    const race = RACES[crewMember.race];
    const expTrait = race.specialTraits.find((t) => t.effects?.expBonus);
    if (expTrait?.effects.expBonus) {
        expMultiplier += expTrait.effects.expBonus;
    }

    crewMember.traits?.forEach((trait) => {
        if (trait.effect?.expBonus) {
            expMultiplier += trait.effect.expBonus;
        }
    });

    // Apply crew_exp technology bonuses
    const crewExpTechs = state.research.researchedTechs.filter((techId) => {
        const tech = RESEARCH_TREE[techId];
        return tech.bonuses.some((b) => b.type === "crew_exp");
    });

    crewExpTechs.forEach((techId) => {
        const tech = RESEARCH_TREE[techId];
        tech.bonuses.forEach((bonus) => {
            if (bonus.type === "crew_exp") {
                expMultiplier += bonus.value;
            }
        });
    });
    console.log(expMultiplier);
    return expMultiplier;
};
