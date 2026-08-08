/**
 * Постройки игрока. Первая система в игре, где ресурсы текут не только
 * «в корабль», но и остаются на карте: аванпост живёт в своей локации,
 * копит добычу в бункер и требует, чтобы за ней прилетели.
 */

/** Газ добывается по атмосфере гиганта — четыре атмосферы, четыре газа */
export type GasType = "deuterium" | "polymers" | "biosynth" | "cryogen";

export type OutpostKind = "gas_collector" | "base";

export interface Outpost {
    id: string;
    kind: OutpostKind;
    /** Локация, в которой стоит постройка */
    locationId: string;
    /** Сектор локации — чтобы показать постройку на карте галактики */
    sectorId: number;
    builtAtTurn: number;
    /** Что накоплено и ждёт вывоза. Полный бункер простаивает */
    bunker: Partial<Record<GasType, number>>;
    /** Ход последнего вывоза — для логов и подсказок */
    lastCollectedAtTurn?: number;
}

/** Почему постройку нельзя поставить здесь и сейчас */
export type OutpostBuildBlocker =
    | "tech_missing"
    | "limit_reached"
    | "already_built"
    | "no_deep_dive"
    | "wrong_location"
    | "not_enough_credits"
    | "not_enough_resources";
