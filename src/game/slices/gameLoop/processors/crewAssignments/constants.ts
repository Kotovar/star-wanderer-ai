/**
 * Константы для системы назначений экипажа
 */

/** Базовое количество опыта за выполнение назначений */
export const BASE_EXP_REWARDS = {
    REPAIR: 8,
    HEAL: 10,
    MORALE: 6,
    POWER: 5,
    NAVIGATION: 5,
    EVADE: 5,
    COMBAT_REPAIR: 8,
    COMBAT_OTHER: 5,
    ANALYSIS_SABOTAGE: 6,
} as const;

/** Базовые значения эффектов назначений */
export const ASSIGNMENT_BASES = {
    REPAIR_AMOUNT: 15,
    HEAL_AMOUNT: 20,
    MORALE_AMOUNT: 15,
    POWER_BONUS: 5,
    NAVIGATION_CONSUMPTION: 1,
    EVADE_BONUS: 3,
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
