import type { GasType, OutpostKind } from "@/game/types/outposts";
import type { ResearchResourceType } from "@/game/types/research";

/** Технология, открывающая строительство вообще */
export const OUTPOST_TECH_ID = "autonomous_systems";

/**
 * Сколько построек каждого рода можно иметь за забег. Лимит — не украшение:
 * без него выбор места превращается в чек-лист «поставить везде», то есть
 * ровно в ту болезнь, от которой лечится вся эта система.
 */
export const OUTPOST_LIMITS: Record<OutpostKind, number> = {
    gas_collector: 3,
    base: 1,
};

/**
 * Газ по атмосфере. Асимметрия намеренная: три газа — товар, четвёртый
 * расходник для билда, поэтому «какой гигант мне попался» — это решение,
 * а не оттенок одного и того же.
 */
export const GAS_BY_ATMOSPHERE: Record<string, GasType> = {
    hydrogen: "deuterium",
    methane: "polymers",
    ammonia: "biosynth",
    nitrogen: "cryogen",
};

/** Базовая цена газа при продаже на торговой станции */
export const GAS_BASE_PRICE: Record<GasType, number> = {
    deuterium: 25,
    polymers: 35,
    biosynth: 45,
    cryogen: 0, // не продаётся: жжётся ради снижения расхода энергии
};

export const GAS_COLLECTOR_COST = {
    credits: 3800,
    resources: {
        tech_salvage: 14,
        rare_minerals: 10,
        energy_samples: 6,
    } as Partial<Record<ResearchResourceType, number>>,
};

/** Сколько газа сборщик даёт за ход */
export const GAS_COLLECTOR_RATE = 1;

/**
 * Потолок бункера. Это и есть механизм, превращающий постройку из пассивного
 * дохода в точку на карте: заполнился — простаивает, пока не прилетишь.
 */
export const GAS_COLLECTOR_BUNKER_CAP = 40;

/** Ходов на полный бункер при пустом старте */
export const GAS_COLLECTOR_FILL_TURNS =
    GAS_COLLECTOR_BUNKER_CAP / GAS_COLLECTOR_RATE;

/** Глубина нырка, дающая право строить на этом гиганте */
export const GAS_COLLECTOR_REQUIRED_DIVE_DEPTH = 4;
