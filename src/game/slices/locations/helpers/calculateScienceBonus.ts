import { getRaceCrewBonus } from "@/game/races";
import type { CrewMember } from "@/game/types";

/**
 * Рассчитывает максимальный бонус науки от всех учёных
 *
 * @param scientists - Список учёных
 * @returns Максимальный бонус науки (десятичная дробь, например 0.35 для +35%)
 */
export const calculateScienceBonus = (scientists: CrewMember[]): number => {
    let maxBonus = 0;

    scientists.forEach((scientist) => {
        const raceBonus = getRaceCrewBonus(scientist.race, "science");
        maxBonus = Math.max(maxBonus, raceBonus);
    });

    return maxBonus;
};
