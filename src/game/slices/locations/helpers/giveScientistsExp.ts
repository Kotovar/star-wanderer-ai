import { getRaceCrewBonus } from "@/game/races";
import type { CrewMember, RaceId } from "@/game/types";
import { ANOMALY_BASE_EXP_PER_LEVEL } from "@/game/constants/experience";

/**
 * Начисляет опыт учёным за исследование аномалии
 *
 * @param scientists - Список учёных
 * @param anomalyLevel - Уровень сложности аномалии
 * @param gainExp - Функция начисления опыта
 * @param expMult - Множитель опыта (зависит от подхода)
 */
export const giveScientistsExp = (
    scientists: CrewMember[],
    anomalyLevel: number,
    gainExp: (crewMember: CrewMember, amount: number) => void,
    expMult = 1,
): void => {
    scientists.forEach((scientist) => {
        const expGain = Math.floor(
            calculateScientistExp(anomalyLevel, scientist.race) * expMult,
        );
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
    let expGain = ANOMALY_BASE_EXP_PER_LEVEL * anomalyLevel;

    const scienceBonus = getRaceCrewBonus(raceId, "science");
    if (scienceBonus > 0) {
        expGain = Math.floor(expGain * (1 + scienceBonus));
    }

    return expGain;
};
