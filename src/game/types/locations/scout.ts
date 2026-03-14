export type ScoutResult = "credits" | "enemy" | "tradeGood" | "nothing";

/**
 * Результат разведки планеты
 */
export interface ScoutingOutcome {
    /** Тип результата */
    type: ScoutResult;
    /** Значение (кредиты) */
    value?: number;
    /** Название предмета (товар) */
    itemName?: string;
}
