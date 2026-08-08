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

/** Ходов на полный бункер при профильном инженере первого уровня */
export const GAS_COLLECTOR_FILL_TURNS =
    GAS_COLLECTOR_BUNKER_CAP / GAS_COLLECTOR_RATE;

/** Глубина нырка, дающая право строить на этом гиганте */
export const GAS_COLLECTOR_REQUIRED_DIVE_DEPTH = 4;

/**
 * Криоген тратится сам, по единице за ход, пока есть запас. Кнопки нет
 * намеренно: решение принимается один раз — какой гигант застолбить, — а
 * дальше это просто запас хода, а не ещё один тумблер на панели.
 */
export const CRYOGEN_BURN_PER_TURN = 1;

/** На сколько криоген снижает расход каждого модуля, пока горит */
export const CRYOGEN_CONSUMPTION_REDUCTION = 1;

/**
 * Множители добычи от приписанного экипажа.
 *
 * Профильный инженер — норма, остальные справляются хуже, уровень добавляет
 * сверху. Пустой слот наказан, но не смертельно: при 0.5 окупаемость улетала
 * за 160 ходов, и человек на аванпосте переставал быть выбором, становясь
 * обязательным условием. 0.7 держит непроверенный сборщик в разумных рамках,
 * а хорошего инженера делает заметным вложением.
 */
export const OUTPOST_CREW_MULTIPLIERS = {
    empty: 0.7,
    offRole: 0.85,
    onRole: 1,
    perLevel: 0.1,
} as const;

/** Профессия, которую просит каждая постройка */
export const OUTPOST_ROLE: Record<string, string> = {
    gas_collector: "engineer",
    base: "engineer",
};

/** Мест гарнизона у постройки */
export const OUTPOST_CREW_SLOTS: Record<string, number> = {
    gas_collector: 1,
};

/** Опыт приписанного за ход: работа на аванпосте — тоже работа */
export const OUTPOST_CREW_EXP = { onRole: 4, offRole: 2 } as const;

/**
 * Изоляция: раз в столько ходов приписанный теряет мораль. Это цена того,
 * что человек уходит с корабля надолго, и повод его иногда сменять.
 */
export const OUTPOST_ISOLATION_INTERVAL = 5;
export const OUTPOST_ISOLATION_MORALE = 3;

/** Наценка станции при скупке газа: продаём дешевле базовой цены */
export const GAS_SELL_RATE = 0.85;
