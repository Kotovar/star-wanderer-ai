import type { GameState } from "@/game/types/game";
import { getCrewDisplayName } from "@/game/crew/crewNames";
import type { CrewMember } from "@/game/types";
import { calculateExpMultiplier } from "./calculateExpMultiplier";
import { applyLevelUp } from "./applyLevelUp";
import { getExpNeededForNextLevel } from "./getExpNeededForNextLevel";
import { MAX_CREW_LEVEL } from "@/game/constants/crew";

/**
 * Результат начисления опыта члену экипажа
 */
export interface GainExpResult {
    /** Фактически начисленный опыт с учётом множителей */
    finalAmount: number;
    /** Обновлённый опыт */
    newExp: number;
    /** Произошло ли повышение уровня */
    leveledUp: boolean;
    /** Новый уровень (если было повышение) */
    newLevel?: number;
    /** Сообщение для лога (если было повышение уровня) */
    logMessage?: string;
    /** Прибавка к максимуму здоровья за полученные уровни (если было повышение) */
    healthGain?: number;
}

/**
 * Вычисляет результат начисления опыта члену экипажа
 *
 * @param crewMember - Член экипажа для получения опыта
 * @param amount - Базовое количество опыта
 * @param state - Текущее состояние игры
 * @returns Результат начисления опыта
 */
export const calculateGainExpResult = (
    crewMember: CrewMember,
    amount: number,
    state: GameState,
): GainExpResult => {
    // На потолке опыт больше не копится: полоса стоит полной, число не растёт
    if (crewMember.level >= MAX_CREW_LEVEL) {
        return {
            finalAmount: 0,
            newExp: getExpNeededForNextLevel(MAX_CREW_LEVEL),
            leveledUp: false,
        };
    }

    const expMultiplier = calculateExpMultiplier(
        crewMember,
        state.research,
        state.crew,
    );
    const finalAmount = Math.floor(amount * expMultiplier);

    const currentExp = crewMember.exp ?? 0;
    const newExp = currentExp + finalAmount;

    const levelUp = applyLevelUp(crewMember, newExp);

    return {
        finalAmount,
        newExp: levelUp ? levelUp.exp : newExp,
        leveledUp: levelUp !== null,
        newLevel: levelUp?.level,
        healthGain: levelUp?.healthGain,
        logMessage:
            levelUp !== null
                ? `${getCrewDisplayName(crewMember)} повысил уровень до ${levelUp.level}!`
                : undefined,
    };
};
