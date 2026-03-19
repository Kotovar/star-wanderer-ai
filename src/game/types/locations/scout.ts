import type { ResearchResourceType } from "@/game/types/research";

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
    /** Количество найденного товара */
    quantity?: number;
    /** Мутация, полученная при разведке */
    mutationName?: string;
    /** Найденные научные ресурсы */
    researchResources?: { type: ResearchResourceType; quantity: number }[];
}
