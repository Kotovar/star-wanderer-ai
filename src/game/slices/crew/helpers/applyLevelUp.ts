import type { CrewMember } from "@/game/types";
import { getExpNeededForNextLevel } from "./getExpNeededForNextLevel";

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
): Pick<CrewMember, "level" | "exp"> | null => {
    const currentLevel = crewMember.level;

    if (!shouldLevelUp(newExp, currentLevel)) {
        return null;
    }

    const { newLevel, remainingExp } = calculateLevelUp(newExp, currentLevel);

    return {
        level: newLevel,
        exp: remainingExp,
    };
};
