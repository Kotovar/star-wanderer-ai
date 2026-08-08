import { GAS_BASE_PRICE } from "@/game/constants/outposts";
import { TRADE_GOODS } from "@/game/constants/goods";
import { RESEARCH_RESOURCES } from "@/game/constants/research/resources";
import type { OutpostResource } from "@/game/types/outposts";

export type HaulKind = "gas" | "good" | "research";

/**
 * Куда девать единицу добычи при вывозе.
 *
 * Бункер копит всё вперемешку, а расходится добыча по трём разным местам:
 * газ в свой пул, торговый товар в трюм, научный образец в исследования.
 * Одна таблица вместо ветвлений по месту использования.
 */
export function getHaulKind(resource: OutpostResource): HaulKind | null {
    if (resource in GAS_BASE_PRICE) return "gas";
    if (resource in TRADE_GOODS) return "good";
    if (resource in RESEARCH_RESOURCES) return "research";
    return null;
}

/**
 * Занимает ли ресурс место в трюме. Научные образцы не занимают — так уже
 * устроены все прочие источники в игре, и менять это ради базы не стоит.
 */
export const takesCargoRoom = (resource: OutpostResource): boolean =>
    getHaulKind(resource) !== "research";
