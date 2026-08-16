import { getRaceCrewBonus } from "@/game/races";
import type { CrewMember } from "@/game/types";
import { getExpNeededForNextLevel } from "./getExpNeededForNextLevel";
import { BASE_CREW_HEALTH_PER_LEVEL, MAX_CREW_LEVEL } from "@/game/constants/crew";
import { RACES } from "@/game/constants/races";

/**
 * Итог повышения уровня. Прибавка здоровья возвращается прибавкой, а не
 * готовым максимумом: применять её нужно к текущему значению в состоянии,
 * иначе левелап откатывает всё, что изменило здоровье после снимка.
 */
export interface LevelUpOutcome {
    level: number;
    exp: number;
    healthGain: number;
}

/**
 * Проверяет, должен ли член экипажа повысить уровень
 *
 * @param currentExp - Текущий опыт
 * @param level - Текущий уровень
 * @returns true если опыт достаточен для повышения уровня
 */
const shouldLevelUp = (currentExp: number, level: number) => {
    if (level >= MAX_CREW_LEVEL) return false;
    const expNeeded = getExpNeededForNextLevel(level);
    return currentExp >= expNeeded;
};

/**
 * Вычисляет новый уровень и остаточный опыт после повышения
 *
 * @param currentExp - Текущий опыт
 * @param currentLevel - Текущий уровень
 * @returns Объект с новым уровнем и остаточным опытом
 */
const calculateLevelUp = (
    currentExp: number,
    currentLevel: number,
): { newLevel: number; remainingExp: number } => {
    let newLevel = currentLevel;
    let remainingExp = currentExp;

    while (
        newLevel < MAX_CREW_LEVEL &&
        remainingExp >= getExpNeededForNextLevel(newLevel)
    ) {
        remainingExp -= getExpNeededForNextLevel(newLevel);
        newLevel += 1;
    }

    // На потолке опыт не копится дальше: полоса просто стоит полной
    if (newLevel >= MAX_CREW_LEVEL) {
        remainingExp = Math.min(
            remainingExp,
            getExpNeededForNextLevel(MAX_CREW_LEVEL),
        );
    }

    return { newLevel, remainingExp };
};

/**
 * Применяет повышение уровня к члену экипажа
 *
 * @param crewMember - Член экипажа
 * @param newExp - Новый опыт после добавления
 * @returns Обновлённый объект члена экипажа или null если повышения не было
 */
export const applyLevelUp = (
    crewMember: CrewMember,
    newExp: number,
): LevelUpOutcome | null => {
    const currentLevel = crewMember.level;

    if (!shouldLevelUp(newExp, currentLevel)) {
        return null;
    }

    const { newLevel, remainingExp } = calculateLevelUp(newExp, currentLevel);

    const levelsGained = newLevel - currentLevel;

    // === ЗДОРОВЬЕ ===
    const raceData = RACES[crewMember.race];

    // Базовое увеличение: 20 HP за каждый полученный уровень
    let healthGain = BASE_CREW_HEALTH_PER_LEVEL * levelsGained;

    // Применяем процентные штрафы расы (voidborn -20%, crystalline -15%)
    let raceHealthPenaltyPercent = 0;
    raceData?.specialTraits?.forEach((trait) => {
        if (trait.effects.healthPenalty) {
            raceHealthPenaltyPercent += Math.abs(
                Number(trait.effects.healthPenalty),
            );
        }
    });

    if (raceHealthPenaltyPercent > 0) {
        healthGain = Math.floor(healthGain * (1 - raceHealthPenaltyPercent));
    }

    // Применяем процентные бонусы/штрафы от трейтов
    crewMember.traits.forEach((trait) => {
        if (trait.effect.healthPenalty) {
            healthGain = Math.floor(
                healthGain * (1 - trait.effect.healthPenalty),
            );
        }
        if (trait.effect.healthBonus) {
            healthGain = Math.floor(
                healthGain * (1 + trait.effect.healthBonus),
            );
        }
    });

    // Фиксированный бонус расы — за каждый полученный уровень, как и в
    // calculateCrewStats (raceHealthBonus * level). Разово он делал скачок
    // через несколько уровней навсегда дешевле по здоровью, чем те же уровни
    // по одному.
    const raceHealthBonus = getRaceCrewBonus(crewMember.race, "health");
    healthGain += raceHealthBonus * levelsGained;

    // Счастье уровень не трогает — ни максимум, ни текущее.
    return { level: newLevel, exp: remainingExp, healthGain };
};
