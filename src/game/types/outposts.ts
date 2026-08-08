/**
 * Постройки игрока. Первая система в игре, где ресурсы текут не только
 * «в корабль», но и остаются на карте: аванпост живёт в своей локации,
 * копит добычу в бункер и требует, чтобы за ней прилетели.
 */

import type { CargoItem } from "./cargo";
import type { Goods } from "./goods";
import type { ResearchResourceType } from "./research";

/** Газ добывается по атмосфере гиганта — четыре атмосферы, четыре газа */
export type GasType = "deuterium" | "polymers" | "biosynth" | "cryogen";

export type OutpostKind = "gas_collector" | "base";

/** Модули, которые ставятся в слоты базы */
export type BaseModuleId =
    | "drill_shaft"
    | "cryo_cracker"
    | "field_lab"
    | "relay"
    | "warehouse"
    | "repair_dock"
    | "med_bay"
    | "barracks"
    | "turrets"
    | "workbench";

/**
 * Что вообще может лежать в бункере. Газ, торговый товар и научный ресурс
 * копятся одинаково, а расходятся только при вывозе — иначе каждый новый
 * модуль базы требовал бы своей ветки и в накоплении, и в сборе.
 */
export type OutpostResource = GasType | Goods | ResearchResourceType;

export interface Outpost {
    id: string;
    kind: OutpostKind;
    /** Локация, в которой стоит постройка */
    locationId: string;
    /** Сектор локации — чтобы показать постройку на карте галактики */
    sectorId: number;
    builtAtTurn: number;
    /** Что накоплено и ждёт вывоза. Полный бункер простаивает */
    bunker: Partial<Record<OutpostResource, number>>;
    /** Недобранная доля единицы в сотых: на дробях терялась каждая десятая единица */
    progress?: number;
    /** То же самое для базы, где модулей несколько и ресурсы разные */
    moduleProgress?: Partial<Record<OutpostResource, number>>;
    /**
     * Груз, оставленный игроком на складе. Отдельно от бункера: у предметов
     * трюма есть привязка к заданию и данные модуля, и счётчиком их не
     * сохранить.
     */
    storedCargo?: CargoItem[];
    /** Уровень базы: определяет число слотов. У сборщика всегда 1 */
    level?: number;
    /** Что стоит в слотах базы */
    modules?: BaseModuleId[];
    /** Ход, когда постройку захватили. Пока стоит — добыча не идёт */
    capturedAtTurn?: number;
    /** До этого хода рейдов не будет: льгота после закладки и после отбития */
    raidGraceUntil?: number;
    /** Сила рейдеров, удерживающих постройку */
    raiderThreat?: number;
    /** Ход последнего вывоза — для логов и подсказок */
    lastCollectedAtTurn?: number;
}

/**
 * Описание постройки, которую dev-шаблон получает на старте. Локация
 * подбирается при генерации галактики: заранее её id не знает никто.
 */
export interface StartingOutpost {
    kind: OutpostKind;
    level?: number;
    modules?: BaseModuleId[];
    bunker?: Partial<Record<OutpostResource, number>>;
    /** Отдать рейдерам сразу — чтобы посмотреть захват и штурм */
    captured?: boolean;
}

/** Почему постройку нельзя поставить здесь и сейчас */
export type OutpostBuildBlocker =
    | "tech_missing"
    | "limit_reached"
    | "already_built"
    | "no_deep_dive"
    | "not_explored"
    | "wrong_location"
    | "not_enough_credits"
    | "not_enough_resources";
