import type { Module } from "@/game/types";

/**
 * Меняет здоровье модуля на процент от его МАКСИМУМА.
 *
 * Все артефакты, чинящие или ломающие модули, описаны в процентах
 * ("+5% здоровья каждый ход", "теряет 5% здоровья", "75% урона"), но раньше
 * каждый из них прибавлял или отнимал это число как плоские единицы. На
 * стандартных 100 HP разницы не было, а на модулях 250 HP артефакт слабел
 * втрое — то есть чем дальше по кампании, тем меньше он значил.
 *
 * @param module - Модуль корабля
 * @param percent - Процент от максимума: положительный чинит, отрицательный ломает
 * @param minHealth - Нижняя граница (проклятия не добивают модуль до нуля)
 */
export const changeHealthByPercent = (
    module: Pick<Module, "health" | "maxHealth">,
    percent: number,
    minHealth = 0,
): number => {
    const delta = Math.round((module.maxHealth * percent) / 100);
    return Math.max(
        minHealth,
        Math.min(module.maxHealth, module.health + delta),
    );
};
