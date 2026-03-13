/**
 * Результат расчёта стоимости услуги
 */
export interface ServiceCostResult {
    /** Итоговая стоимость */
    cost: number;
    /** Процент повреждения (0-1) */
    damagePercent: number;
    /** Можно ли использовать услугу */
    canUse: boolean;
}
