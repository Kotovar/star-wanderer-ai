// ============================================================================
// Константы для торговли на станциях
// ============================================================================

/** Базовый множитель цены для расчёта цены покупки */
export const BASE_BUY_PRICE_MULTIPLIER = 1.6;

/** Минимальный множитель вариации цены (0.7 = 70% от базовой) */
export const MIN_PRICE_VARIATION = 0.7;

/** Максимальный множитель вариации цены (0.6 = +60% к минимальной) */
export const MAX_PRICE_VARIATION = 0.6;

/** Минимальное количество товара на складе */
export const MIN_STOCK_AMOUNT = 20;

/** Максимальное случайное дополнение к складу */
export const MAX_STOCK_VARIATION = 30;

/** Значение скидки по умолчанию (без скидки) */
export const DEFAULT_DISCOUNT = 1;

/**
 * Диапазон множителей цены для расчёта цен
 */
export const PRICE_MULTIPLIER_RANGE = {
    min: MIN_PRICE_VARIATION,
    max: MIN_PRICE_VARIATION + MAX_PRICE_VARIATION, // 0.7 + 0.6 = 1.3
} as const;

/**
 * Диапазон количества товара на складе
 */
export const STOCK_RANGE = {
    min: MIN_STOCK_AMOUNT,
    max: MIN_STOCK_AMOUNT + MAX_STOCK_VARIATION, // 20 + 30 = 50
} as const;
