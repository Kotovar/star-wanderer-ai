import { SCOUTING_PROBABILITIES, SCOUTING_CREDIT_REWARD } from "../constants";
import { TRADE_GOODS } from "@/game/constants";
import { typedKeys } from "@/lib/utils";
import type { ScoutingOutcome } from "@/game/types";

/**
 * Определяет результат разведки на основе случайного числа
 *
 * @param randomValue - Случайное число от 0 до 1
 * @returns Объект с результатом разведки
 */
export const determineScoutingOutcome = (
    randomValue: number,
): ScoutingOutcome => {
    if (randomValue < SCOUTING_PROBABILITIES.CREDITS) {
        return generateCreditReward();
    } else if (
        randomValue <
        SCOUTING_PROBABILITIES.CREDITS + SCOUTING_PROBABILITIES.TRADE_GOOD
    ) {
        return generateTradeGoodReward();
    } else {
        return { type: "nothing" };
    }
};

/**
 * Генерирует награду в кредитах
 *
 * @returns Объект с результатом разведки (кредиты)
 */
const generateCreditReward = (): ScoutingOutcome => {
    const reward = Math.floor(
        SCOUTING_CREDIT_REWARD.MIN +
            Math.random() *
                (SCOUTING_CREDIT_REWARD.MAX - SCOUTING_CREDIT_REWARD.MIN),
    );
    return {
        type: "credits",
        value: reward,
    };
};

/**
 * Генерирует награду в виде товара
 *
 * @returns Объект с результатом разведки (товар)
 */
const generateTradeGoodReward = (): ScoutingOutcome => {
    const keys = typedKeys(TRADE_GOODS);
    const goodId = keys[Math.floor(Math.random() * keys.length)];
    return {
        type: "tradeGood",
        itemName: TRADE_GOODS[goodId].name,
    };
};
