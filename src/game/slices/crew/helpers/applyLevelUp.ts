import type { CrewMember } from "@/game/types";
import { getExpNeededForNextLevel } from "./getExpNeededForNextLevel";
import { BASE_CREW_HEALTH_PER_LEVEL } from "@/game/constants/crew";
import { RACES } from "@/game/constants/races";

/**
 * Проверяет, должен ли член экипажа повысить уровень
 *
 * @param currentExp - Текущий опыт
 * @param level - Текущий уровень
 * @returns true если опыт достаточен для повышения уровня
 */
export const shouldLevelUp = (currentExp: number, level: number) => {
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
export const calculateLevelUp = (
    currentExp: number,
    currentLevel: number,
): { newLevel: number; remainingExp: number } => {
    const expNeeded = getExpNeededForNextLevel(currentLevel);
    const remainingExp = currentExp - expNeeded;

    return {
        newLevel: currentLevel + 1,
        remainingExp,
    };
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
): Pick<
    CrewMember,
    "level" | "exp" | "maxHealth" | "health" | "maxHappiness" | "happiness"
> | null => {
    const currentLevel = crewMember.level;

    if (!shouldLevelUp(newExp, currentLevel)) {
        return null;
    }

    const { newLevel, remainingExp } = calculateLevelUp(newExp, currentLevel);

    // === ЗДОРОВЬЕ ===
    const raceData = RACES[crewMember.race];

    // Базовое увеличение: 20 HP за уровень
    let healthGain = BASE_CREW_HEALTH_PER_LEVEL;

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

    // Добавляем фиксированный бонус расы (human +5, xenosymbiont +10, krylorian +15)
    const raceHealthBonus = raceData?.crewBonuses?.health ?? 0;
    healthGain += raceHealthBonus;

    const newMaxHealth = crewMember.maxHealth + healthGain;

    // === СЧАСТЬЕ ===
    // Счастье не увеличивается с уровнем, если только нет специальных эффектов
    // На данный момент нет бонусов к maxHappiness за уровень
    const newMaxHappiness = crewMember.maxHappiness;

    return {
        level: newLevel,
        exp: remainingExp,
        maxHealth: newMaxHealth,
        health: newMaxHealth, // Полное восстановление при левелапе
        maxHappiness: newMaxHappiness,
        happiness: crewMember.happiness, // Счастье не меняется
    };
};
