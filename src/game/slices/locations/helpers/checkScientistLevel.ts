import type { CrewMember } from "@/game/types";

/**
 * Проверяет, достаточно ли у учёных уровня для исследования аномалии
 *
 * @param scientists - Список учёных
 * @param requiredLevel - Требуемый уровень аномалии
 * @returns Объект с результатом проверки и максимальным уровнем учёного
 */
export const checkScientistLevel = (
    scientists: CrewMember[],
    requiredLevel: number,
): { canResearch: boolean; maxLevel: number } => {
    const maxLevel = scientists.length > 0
        ? Math.max(...scientists.map((s) => s.level || 1))
        : 0;

    return {
        canResearch: maxLevel >= requiredLevel,
        maxLevel,
    };
};
