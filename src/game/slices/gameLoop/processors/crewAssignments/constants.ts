/**
 * Константы для системы назначений экипажа
 */

import { CREW_ASSIGNMENT_EXP } from "@/game/constants/experience";
import { getAugmentationBonus } from "@/game/constants/augmentations";
import type { CrewMember } from "@/game/types/crew";

/** Настроение выше этой доли от максимума — нейтрально (не растёт бонус дальше по прямой от 50%) */
const HAPPINESS_EFFICIENCY_MAX_BONUS = 0.1; // +10% при 100% настроения
const HAPPINESS_EFFICIENCY_MAX_PENALTY = 0.15; // -15% при 0% настроения

/**
 * Множитель эффективности от текущего настроения экипажа: линейно от -15%
 * (настроение на нуле) до +10% (настроение на максимуме), 0% на середине
 * шкалы — счастливый экипаж работает эффективнее, несчастный хуже (отдельно
 * от дезертирства при затяжном нуле настроения). Расы без настроения
 * (maxHappiness = 0, например синтетики) не затрагиваются.
 */
export function getHappinessEfficiencyModifier(crewMember: CrewMember): number {
    if (!crewMember.maxHappiness) return 0;
    const centered = (crewMember.happiness / crewMember.maxHappiness - 0.5) * 2;
    return centered >= 0
        ? centered * HAPPINESS_EFFICIENCY_MAX_BONUS
        : centered * HAPPINESS_EFFICIENCY_MAX_PENALTY;
}

/**
 * Возвращает итоговый множитель задания с учётом трейтов (taskBonus, doubleTaskEffect),
 * аугментации (actionSpeedBonus — например, Разгон ядра у синтетика) и настроения
 * экипажа. Используется всеми типами назначений.
 */
export function getTaskBonusMultiplier(crewMember: CrewMember): number {
    let taskBonus = 0;
    let taskPenalty = 0;
    let hasDoubleEffect = false;
    crewMember.traits?.forEach((trait) => {
        if (trait.effect?.taskBonus) taskBonus += trait.effect.taskBonus;
        if (trait.effect?.taskPenalty) taskPenalty += trait.effect.taskPenalty;
        if (trait.effect?.doubleTaskEffect) hasDoubleEffect = true;
    });
    if (hasDoubleEffect) taskBonus = Math.max(taskBonus, 1);
    taskBonus += getAugmentationBonus(crewMember, "actionSpeedBonus");
    taskBonus += getHappinessEfficiencyModifier(crewMember);
    return Math.max(0, 1 + taskBonus - taskPenalty);
}

/** Базовое количество опыта за выполнение назначений */
export const BASE_EXP_REWARDS = CREW_ASSIGNMENT_EXP;

/** Базовые значения эффектов назначений */
export const ASSIGNMENT_BASES = {
    REPAIR_AMOUNT: 15,
    HEAL_AMOUNT: 20,
    MORALE_AMOUNT: 15,
    POWER_BONUS: 5,
    NAVIGATION_CONSUMPTION: 1,
    EVADE_BONUS: 3,
    PATROL_CREDITS_PER_LEVEL: 5,
    FUEL_SYNTHESIS_AMOUNT: 1,
    FUEL_SYNTHESIS_HAPPINESS_COST: 2,
} as const;

/** Множители и лимиты */
export const ASSIGNMENT_MULTIPLIERS = {
    MAX_HEALTH: 100,
    MAX_HAPPINESS: 100,
    MIN_HAPPINESS: 0,
    ZERO_HAPPINESS: 0,
} as const;
