import type { CrewMember } from "@/game/types";
import { RACES } from "@/game/constants/races";

/**
 * Рассчитывает максимальный бонус науки от всех учёных
 *
 * @param scientists - Список учёных
 * @returns Максимальный бонус науки (десятичная дробь, например 0.35 для +35%)
 */
export const calculateScienceBonus = (scientists: CrewMember[]): number => {
    let maxBonus = 0;

    scientists.forEach((scientist) => {
        const race = RACES[scientist.race];
        const raceBonus = race?.crewBonuses?.science || 0;
        maxBonus = Math.max(maxBonus, raceBonus);
    });

    return maxBonus;
};
