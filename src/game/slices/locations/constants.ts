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
        amount: { min: 1, max: 2 },
    },
    temporal: {
        type: "ancient_data",
        amount: { min: 2, max: 4 },
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
};

// ============================================================================
// Константы для аномалий
// ============================================================================

/**
 * Базовая награда за посещение аномалии (за уровень сложности)
 */
export const ANOMALY_BASE_REWARD_PER_LEVEL = 220;

/**
 * Максимальный случайный бонус к награде
 */
export const ANOMALY_RANDOM_REWARD_MAX = 280;

/**
 * Базовый урон от аномалии (за уровень сложности)
 */
export const ANOMALY_BASE_DAMAGE_PER_LEVEL = 15;

/**
 * Максимальный случайный урон от аномалии
 */
export const ANOMALY_RANDOM_DAMAGE_MAX = 25;

/**
 * Минимальное здоровье модуля после повреждения аномалией
 */
export const ANOMALY_MIN_MODULE_HEALTH = 10;

// ============================================================================
// Константы для разведки планет
// ============================================================================

/**
 * Количество разведок для полного исследования планеты
 */
export const SCOUTING_REQUIRED_VISITS = 3;

/**
 * Вероятности результатов разведки
 */
export const SCOUTING_PROBABILITIES = {
    /** Шанс найти кредиты (40%) */
    CREDITS: 0.4,
    /** Шанс найти товар (30%) */
    TRADE_GOOD: 0.3,
    /** Шанс ничего не найти (30%) */
    NOTHING: 0.3,
};

/**
 * Награда за разведку (кредиты)
 */
export const SCOUTING_CREDIT_REWARD = {
    /** Минимальная награда */
    MIN: 100,
    /** Максимальная награда */
    MAX: 250,
};

/**
 * Количество найденного товара при разведке: 1–3 + уровень разведчика
 */
export const SCOUTING_TRADE_GOOD_BASE_MIN = 1;
export const SCOUTING_TRADE_GOOD_BASE_MAX = 3;

// ============================================================================
// Константы для сигналов бедствия
// ============================================================================

/**
 * Награда за спасение выживших (кредиты)
 */
export const SURVIVORS_REWARD = {
    /** Минимальная награда */
    MIN: 150,
    /** Максимальная награда */
    MAX: 300,
};

/**
 * Шанс того, что выживший присоединится к экипажу (30%)
 */
export const SURVIVOR_JOINS_CHANCE = 0.3;

/**
 * Награда за заброшенный груз (кредиты)
 */
export const ABANDONED_CARGO_CREDITS = {
    /** Минимальная награда */
    MIN: 150,
    /** Максимальная награда */
    MAX: 300,
};

/**
 * Количество товара в заброшенном грузе
 */
export const ABANDONED_CARGO_QUANTITY = {
    /** Минимальное количество */
    MIN: 10,
    /** Максимальное количество */
    MAX: 25,
};

/**
 * Шанс найти артефакт в заброшенном грузе (25%)
 */
export const ABANDONED_CARGO_ARTIFACT_CHANCE = 0.25;
