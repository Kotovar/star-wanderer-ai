import type { BaseModuleId, OutpostResource } from "@/game/types/outposts";
import type { PlanetFeatureId } from "@/game/planets/features";
import type { ResearchResourceType } from "@/game/types/research";

export interface BaseModuleDef {
    id: BaseModuleId;
    icon: string;
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
}

/**
 * Модули базы. Пока только добывающие — они дают базе смысл сами по себе.
 * Служебные (склад, ретранслятор, ремдок, медблок, верстак, казарма, турели)
 * приходят в следующей фазе и встают в те же слоты, поэтому выбор «что
 * поставить» будет только острее.
 */
export const BASE_MODULES: Record<BaseModuleId, BaseModuleDef> = {
    drill_shaft: {
        id: "drill_shaft",
        icon: "⛏️",
        role: "engineer",
        cost: {
            credits: 1200,
            resources: { tech_salvage: 8, rare_minerals: 6 },
        },
        output: { minerals: 2, rare_minerals: 1 },
        boostedBy: "rich_deposits",
    },
    cryo_cracker: {
        id: "cryo_cracker",
        icon: "🧊",
        role: "engineer",
        cost: {
            credits: 1000,
            resources: { tech_salvage: 6, energy_samples: 5 },
        },
        output: { water: 3 },
        // Крекеру нужен лёд: на планете без шапок ему нечего перерабатывать
        requiresFeature: "ice_caps",
    },
    field_lab: {
        id: "field_lab",
        icon: "🔬",
        role: "scientist",
        cost: {
            credits: 1400,
            resources: { tech_salvage: 6, ancient_data: 6 },
        },
        output: { ancient_data: 1, alien_biology: 1 },
        boostedBy: "ancient_traces",
    },
};

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
    { credits: 5000, resources: { tech_salvage: 18, quantum_crystals: 4 } },
    { credits: 9000, resources: { tech_salvage: 26, quantum_crystals: 8 } },
] as const;

/** Потолок бункера базы — она крупнее сборщика */
export const BASE_BUNKER_CAP = 60;

/** Мест гарнизона: уровень даёт по одному */
export const getBaseCrewSlots = (level: number): number => level;
