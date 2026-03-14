import type { GameState } from "@/game/types/game";
import type { CrewMember } from "@/game/types";
import { calculateExpMultiplier } from "./calculateExpMultiplier";
import { applyLevelUp } from "./applyLevelUp";

/**
 * Результат начисления опыта члену экипажа
 */
export interface GainExpResult {
    /** Обновлённый опыт */
    newExp: number;
    /** Произошло ли повышение уровня */
    leveledUp: boolean;
    /** Новый уровень (если было повышение) */
    newLevel?: number;
    /** Сообщение для лога (если было повышение уровня) */
    logMessage?: string;
    /** Данные о повышении уровня (если было повышение) */
    levelUpData?: Pick<
        CrewMember,
        "maxHealth" | "health" | "maxHappiness" | "happiness"
    >;
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
    const expMultiplier = calculateExpMultiplier(crewMember, state);
    const finalAmount = Math.floor(amount * expMultiplier);

    const currentExp = crewMember.exp ?? 0;
    const newExp = currentExp + finalAmount;

    const levelUp = applyLevelUp(crewMember, newExp);

    return {
        newExp: levelUp ? levelUp.exp : newExp,
        leveledUp: levelUp !== null,
        newLevel: levelUp?.level,
        levelUpData: levelUp
            ? {
                  maxHealth: levelUp.maxHealth,
                  health: levelUp.health,
                  maxHappiness: levelUp.maxHappiness,
                  happiness: levelUp.happiness,
              }
            : undefined,
        logMessage:
            levelUp !== null
                ? `${crewMember.name} повысил уровень до ${levelUp.level}!`
                : undefined,
    };
};
