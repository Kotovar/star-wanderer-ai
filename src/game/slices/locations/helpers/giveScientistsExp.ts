import type { CrewMember, RaceId } from "@/game/types";
import { RACES } from "@/game/constants/races";
import { ANOMALY_BASE_EXP_PER_LEVEL } from "@/game/constants/experience";

/**
 * Начисляет опыт учёным за исследование аномалии
 *
 * @param scientists - Список учёных
 * @param anomalyLevel - Уровень сложности аномалии
 * @param gainExp - Функция начисления опыта
 */
export const giveScientistsExp = (
    scientists: CrewMember[],
    anomalyLevel: number,
    gainExp: (crewMember: CrewMember, amount: number) => void,
): void => {
    scientists.forEach((scientist) => {
        const expGain = calculateScientistExp(anomalyLevel, scientist.race);
        gainExp(scientist, expGain);
    });
};

/**
 * Рассчитывает опыт для учёного с учётом расовых бонусов
 *
 * @param anomalyLevel - Уровень аномалии
 * @param raceId - ID расы учёного
 * @returns Количество опыта
 */
const calculateScientistExp = (
    anomalyLevel: number,
    raceId: RaceId,
): number => {
    const race = RACES[raceId];
    let expGain = ANOMALY_BASE_EXP_PER_LEVEL * anomalyLevel;

    const scienceBonus = race?.crewBonuses?.science || 0;
    if (scienceBonus > 0) {
        expGain = Math.floor(expGain * (1 + scienceBonus));
    }

    return expGain;
};
