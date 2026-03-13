// ============================================================================
// Константы для локаций
// ============================================================================

// ============================================================================
// Константы для добычи астероидов
// ============================================================================

/** Уровни буров */
export const DRILL_LEVEL = {
    BASIC: 1,
    ADVANCED: 2,
    SUPERIOR: 3,
    ANCIENT: 4,
} as const;

/** Тиры астероидов */
export const ASTEROID_TIER = {
    BASIC: 1,
    ADVANCED: 2,
    SUPERIOR: 3,
    ANCIENT: 4,
} as const;

/** Базовый бонус эффективности */
export const BONUS_BASE = 1;

/** Бонус за уровень разницы бура */
export const DRILL_LEVEL_BONUS = 0.2;

/** Делитель для процентов */
export const PERCENT_DIVISOR = 100;

/** Минимальное количество ресурсов при частичной загрузке */
export const MIN_CARGO_QUANTITY = 1;

/** Базовый опыт инженеру за добычу астероида 1 тира */
export const BASE_ENGINEER_EXP = 15;

// ============================================================================
// Константы для штормов
// ============================================================================

/** Конфигурация эффектов для каждого типа шторма */
export const STORM_CONFIG: Record<
    string,
    {
        shieldDamage?: { min: number; max: number };
        shieldDamageType?: "all";
        crewDamage?: { min: number; max: number };
        moduleDamage?: { min: number; max: number };
        lootMultiplier: number;
        disableModules?: boolean;
        resetExp?: boolean;
        damageAllModules?: boolean;
    }
> = {
    radiation: {
        crewDamage: { min: 25, max: 35 },
        moduleDamage: { min: 5, max: 10 },
        lootMultiplier: 2,
    },
    ionic: {
        shieldDamageType: "all",
        moduleDamage: { min: 8, max: 15 },
        lootMultiplier: 2.5,
    },
    plasma: {
        shieldDamage: { min: 25, max: 45 },
        moduleDamage: { min: 18, max: 30 },
        lootMultiplier: 3,
    },
    gravitational: {
        moduleDamage: { min: 20, max: 35 },
        lootMultiplier: 2.5,
        damageAllModules: true,
    },
    temporal: {
        crewDamage: { min: 15, max: 25 },
        lootMultiplier: 2.5,
        resetExp: true,
    },
    nanite: {
        shieldDamage: { min: 15, max: 25 },
        moduleDamage: { min: 10, max: 18 },
        lootMultiplier: 2,
        disableModules: true,
    },
};

/** Конфигурация наград за штормы */
export const STORM_LOOT_CONFIG = {
    /** Базовый диапазон кредитов */
    baseLoot: { min: 80, max: 150 },
    /** Шанс редкого лута (базовый) */
    rareLootChanceBase: 0.1,
    /** Базовый диапазон редкого бонуса */
    rareLootBonus: { min: 100, max: 250 },
};

/** Конфигурация специальных ресурсов для штормов */
export const STORM_RESOURCES: Record<
    string,
    { type: string; amount: { min: number; max: number } } | undefined
> = {
    gravitational: {
        type: "quantum_crystals",
        amount: { min: 15, max: 25 },
    },
    temporal: {
        type: "ancient_data",
        amount: { min: 20, max: 35 },
    },
    radiation: undefined,
    ionic: undefined,
    plasma: undefined,
    nanite: undefined,
};

/** Общие константы для штормов */
export const STORM_COMMON = {
    /** Минимальное здоровье модуля после урона */
    moduleMinHealth: 10,
    /** Минимальное здоровье экипажа после урона */
    crewMinHealth: 10,
    /** Минимальное счастье экипажа после урона */
    crewMinHappiness: 0,
    /** Снижение счастья экипажа */
    crewHappinessPenalty: 10,
    /** Количество модулей для случайного урона */
    randomModulesToDamage: { min: 1, max: 2 },
    /** Опыт учёному за изучение шторма */
    scientistExp: 25,
};
