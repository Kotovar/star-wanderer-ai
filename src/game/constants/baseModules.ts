import type { BaseModuleId, OutpostResource } from "@/game/types/outposts";
import type { PlanetFeatureId } from "@/game/planets/features";
import type { ResearchResourceType } from "@/game/types/research";

export interface BaseModuleDef {
    id: BaseModuleId;
    /** Профессия, которая усиливает этот модуль */
    role: string;
    cost: {
        credits: number;
        resources: Partial<Record<ResearchResourceType, number>>;
    };
    /** Сколько чего даёт за ход, до множителя гарнизона */
    output: Partial<Record<OutpostResource, number>>;
    /** Черта планеты, без которой модуль не поставить */
    requiresFeature?: PlanetFeatureId;
    /** Черта, которая удваивает выход */
    boostedBy?: PlanetFeatureId;
    /** Служебный эффект: не добывает, а меняет правила */
    service?: BaseService;
}

/**
 * Что умеет служебный модуль. Ровно один эффект на модуль намеренно: слот
 * стоит дорого, и «этот модуль делает три вещи» превратило бы выбор обратно
 * в чек-лист.
 */
export type BaseService =
    | "relay"
    | "storage"
    | "repair"
    | "heal"
    | "garrison"
    | "defense"
    | "craft";

/**
 * Выработка задана от потолка, а не от «сколько не жалко»: шесть модулей на
 * максимальном уровне обязаны давать меньше, чем игрок зарабатывает руками,
 * иначе оптимальной стратегией станет «построил и забыл». Числа держит
 * check:outpost-economy, он же и поймал первую версию, где одна буровая
 * давала 700₢ за ход против 1230 за целый бой третьего тира.
 *
 * Модули базы. Пока только добывающие — они дают базе смысл сами по себе.
 * Служебные (склад, ретранслятор, ремдок, медблок, верстак, казарма, турели)
 * приходят в следующей фазе и встают в те же слоты, поэтому выбор «что
 * поставить» будет только острее.
 */
export const BASE_MODULES: Record<BaseModuleId, BaseModuleDef> = {
    drill_shaft: {
        id: "drill_shaft",
        role: "engineer",
        cost: {
            credits: 1200,
            resources: { rare_minerals: 8, energy_samples: 5 },
        },
        // 80₢/ход до удвоения чертой. Числа дробные намеренно: остаток
        // копится в сотых, и редкий минерал выходит примерно раз в 17 ходов
        output: { minerals: 0.5, rare_minerals: 0.06 },
        boostedBy: "rich_deposits",
    },
    cryo_cracker: {
        id: "cryo_cracker",
        role: "engineer",
        cost: {
            credits: 1000,
            resources: { energy_samples: 8, void_membrane: 4 },
        },
        output: { water: 0.8 },
        // Крекеру нужен лёд: на планете без шапок ему нечего перерабатывать
        requiresFeature: "ice_caps",
    },
    field_lab: {
        id: "field_lab",
        role: "scientist",
        cost: {
            credits: 1400,
            resources: { ancient_data: 8, alien_biology: 5 },
        },
        // 0.4 давали за 100 ходов 38% всей потребности дерева в биообразцах:
        // лаборатория была сильнейшим модулем, а проверка её не видела —
        // она считает кредиты, а наука кредитов не приносит
        output: { ancient_data: 0.25, alien_biology: 0.2 },
        boostedBy: "ancient_traces",
    },
    relay: {
        id: "relay",
        role: "scout",
        cost: {
            credits: 1600,
            resources: { tech_salvage: 8, ancient_data: 4 },
        },
        output: {},
        service: "relay",
    },
    warehouse: {
        id: "warehouse",
        role: "engineer",
        cost: {
            credits: 900,
            resources: { rare_minerals: 10 },
        },
        output: {},
        service: "storage",
    },
    repair_dock: {
        id: "repair_dock",
        role: "engineer",
        cost: {
            credits: 1800,
            resources: { tech_salvage: 12, rare_minerals: 8 },
        },
        output: {},
        service: "repair",
    },
    med_bay: {
        id: "med_bay",
        role: "medic",
        cost: {
            credits: 1500,
            resources: { alien_biology: 12, void_membrane: 5 },
        },
        output: {},
        service: "heal",
    },
    barracks: {
        id: "barracks",
        role: "medic",
        cost: {
            credits: 1100,
            resources: { energy_samples: 10, alien_biology: 5 },
        },
        output: {},
        service: "garrison",
    },
    turrets: {
        id: "turrets",
        role: "gunner",
        cost: {
            credits: 2000,
            resources: { tech_salvage: 14, rare_minerals: 10 },
        },
        output: {},
        service: "defense",
    },
    workbench: {
        id: "workbench",
        role: "engineer",
        cost: {
            credits: 1700,
            resources: { tech_salvage: 10, quantum_crystals: 4 },
        },
        output: {},
        service: "craft",
    },
};

/** Что даёт каждый служебный модуль в числах */
export const BASE_SERVICE_VALUES = {
    /** Ретранслятор: +к дальности сканирования, пока база цела */
    relayScanRange: 2,
    /** Склад: сколько единиц можно держать на базе сверх трюма */
    storageCapacity: 80,
    /** Ремдок: прочности модулям корабля за визит */
    repairAmount: 40,
    /** Медблок: здоровья экипажу за визит и снятие усталости */
    healAmount: 40,
    /** Казарма: дополнительные места гарнизона */
    garrisonSlots: 2,
    /** Турели: во сколько раз реже случается захват */
    turretProtection: 0.4,
    /** Казарма: сколько стоит нанять поселенца выбранной профессии */
    settlerCost: 1400,
    /** Турели при штурме: насколько слабее рейдеры, потрёпанные обороной */
    turretThreatRelief: 1,
} as const;

/**
 * Картинки. Путь строится из id, а не хранится полем у каждого модуля:
 * поле пришлось бы заполнять руками, и забытое означало бы пустое место
 * без единой жалобы. Эмодзи остаётся запасным вариантом, как у технологий.
 */
export const getBaseModuleImage = (id: BaseModuleId): string =>
    `/assets/base-modules/${id}.webp`;

/** Иллюстрация базы по уровню и газосборника */
export const getBaseImage = (level: number): string =>
    `/assets/base/level-${Math.min(BASE_MAX_LEVEL, Math.max(1, level))}.webp`;

export const GAS_COLLECTOR_IMAGE = "/assets/base/gas_collector.webp";

/** Захваченная база: та же постройка, но под рейдерами */
export const BASE_CAPTURED_IMAGE = "/assets/base/base-captured.webp";

/** Слоты по уровню базы: 1 → 2, 2 → 4, 3 → 6 */
export const BASE_SLOTS_BY_LEVEL = [0, 2, 4, 6] as const;
export const BASE_MAX_LEVEL = 3;

/** Постройка самой базы */
export const BASE_COST = {
    credits: 6000,
    resources: {
        tech_salvage: 20,
        rare_minerals: 15,
        energy_samples: 10,
    } as Partial<Record<ResearchResourceType, number>>,
};

/** Апгрейд уровня: дорожает с каждым разом */
export const BASE_UPGRADE_COST = [
    null,
    { credits: 5000, resources: { tech_salvage: 10, quantum_crystals: 4 } },
    { credits: 9000, resources: { tech_salvage: 14, quantum_crystals: 8 } },
] as const;

/** Потолок бункера базы — она крупнее сборщика */
export const BASE_BUNKER_CAP = 60;

/** Мест гарнизона: уровень даёт по одному */
export const getBaseCrewSlots = (level: number): number => level;
