/**
 * Константы для системы назначений экипажа
 */

import { CREW_ASSIGNMENT_EXP } from "@/game/constants/experience";
import { AUGMENTATIONS } from "@/game/constants/augmentations";
import type { CrewMember } from "@/game/types/crew";

/**
 * Возвращает итоговый множитель задания с учётом трейтов (taskBonus, doubleTaskEffect)
 * и аугментации (actionSpeedBonus — например, Разгон ядра у синтетика).
 * Используется всеми типами назначений.
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
    if (crewMember.augmentation) {
        const augEffect = AUGMENTATIONS[crewMember.augmentation]?.effect;
        if (augEffect?.actionSpeedBonus) taskBonus += augEffect.actionSpeedBonus;
    }
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
} as const;

/** Множители и лимиты */
export const ASSIGNMENT_MULTIPLIERS = {
    MAX_HEALTH: 100,
    MAX_HAPPINESS: 100,
    MIN_HAPPINESS: 0,
    ZERO_HAPPINESS: 0,
} as const;

/** Шансы и коэффициенты */
export const ASSIGNMENT_CHANCES = {
    GLITCH_REDUCTION_FROM_MERGE: 0.5, // -50% шанс сбоя ИИ
} as const;

/** Пороги для эффектов */
export const ASSIGNMENT_THRESHOLDS = {
    CRITICAL_HEALTH: 30,
    BROKEN_MODULE: 0,
    ZERO_HAPPINESS: 0,
} as const;
