interface Common {
    /** Сообщение об ошибке */
    error?: string;
    /** Цена покупки / продажи */
    price?: number;
}

/**
 * Результат проверки возможности покупки
 */
export interface BuyValidation extends Common {
    /** Можно ли купить */
    canBuy: boolean;
}

/**
 * Результат проверки возможности продажи
 */
export interface SellValidation extends Common {
    /** Можно ли продать */
    canSell: boolean;
    /** Количество жадных членов экипажа */
    greedyCrewCount?: number;
}
