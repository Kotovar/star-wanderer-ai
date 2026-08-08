import type { PlanetType } from "@/game/types/planets";
import type { ResearchResourceType } from "@/game/types/research";
import type { ExploreTileType } from "@/game/types/exploration";

type ExpeditionEnvironment = {
    icon: string;
    labelKey: "volcanic" | "ice" | "ocean";
    apCost?: number;
    stepDamage?: number;
    artifactWeightBonus?: number;
};

const EXPEDITION_PLANET_ENVIRONMENTS: Partial<
    Record<PlanetType, ExpeditionEnvironment>
> = {
    "Вулканическая": {
        icon: "🌋",
        labelKey: "volcanic",
        stepDamage: 5,
    },
    "Ледяная": {
        icon: "❄️",
        labelKey: "ice",
        apCost: 2,
        artifactWeightBonus: 2,
    },
    "Океаническая": {
        icon: "🌊",
        labelKey: "ocean",
        artifactWeightBonus: 2,
    },
};

export function getExpeditionEnvironment(planetType?: PlanetType) {
    return planetType ? EXPEDITION_PLANET_ENVIRONMENTS[planetType] : undefined;
}

export const EXPEDITION_GRID_SIZE = 5;
export const EXPEDITION_TILE_COUNT = 25;
export const EXPEDITION_MAX_ARTIFACTS = 2;
export const EXPEDITION_RUINS_MAX_DEPTH = 2;
const EXPEDITION_RUINS_RISK_PER_DEPTH = 8;

export function getRuinsDepthRewardMultiplier(depth: number): number {
    return depth + 1;
}

export function getRuinsDepthDamage(depth: number): number {
    return depth * EXPEDITION_RUINS_RISK_PER_DEPTH;
}

// Индекс центральной клетки — зона высадки, точка старта исследования.
export const EXPEDITION_START_INDEX = Math.floor(EXPEDITION_TILE_COUNT / 2);

// Эффекты профессий в отряде.
export const EXPEDITION_SCIENTIST_LAB_BONUS = 1; // +ресурс с лаборатории за каждого учёного
export const EXPEDITION_SCANS_PER_SCIENTIST = 1; // сканирований поверхности за каждого учёного
export const EXPEDITION_GUNNER_DAMAGE_REDUCTION = 0.25; // снижение урона инцидента за каждого стрелка
export const EXPEDITION_MEDIC_MORALE_REDUCTION = 0.34; // снижение потери морали за каждого медика
export const EXPEDITION_PROFESSION_CAP = 0.75; // общий потолок снижения урона/морали

export const EXPEDITION_MARKET_CREDITS_MIN = 150;
export const EXPEDITION_MARKET_CREDITS_MAX = 400;

export const EXPEDITION_LAB_RESOURCE_MIN = 1;
export const EXPEDITION_LAB_RESOURCE_MAX = 3;

export const EXPEDITION_INCIDENT_DAMAGE_MIN = 20;
export const EXPEDITION_INCIDENT_DAMAGE_MAX = 35;
export const EXPEDITION_INCIDENT_MORALE_LOSS = 12;

export const EXPEDITION_GOOD_FIND_MORALE_BOOST = 4;

export const EXPEDITION_CREW_SCOUT_EXP = 20;
export const EXPEDITION_CREW_OTHER_EXP = 8;

/**
 * Подготовка к высадке подсвечивает клетки будущей сетки. Разведка сюда не
 * входит намеренно: экспедиция на пустую планету и так требует полного
 * исследования, поэтому по числу разведмиссий выбора нет. А вот орбитальный
 * скан, анализ атмосферы и проходы бура — дело добровольное, и каждый стоит
 * хода. Кто спешит высадиться, идёт вслепую.
 */
export const EXPEDITION_PREP_PEEKS = {
    orbitalScan: 2,
    atmosphereAnalysis: 1,
    drillPass: 1,
} as const;

/** Потолок подсветки: сетка из 25 клеток не должна вскрываться заранее */
export const EXPEDITION_PREP_PEEK_CAP = 6;

// ─── Словари клеток ───────────────────────────────────────────────────────

/**
 * Какие клетки бывают на планете каждого рода. Легенда обязана брать список
 * отсюда же, откуда его берёт генерация: пока она рисовала весь союз типов,
 * игрок на необитаемой планете видел в подсказках рынок и лабораторию,
 * которых там не бывает.
 */
export const POPULATED_TILE_TYPES: readonly ExploreTileType[] = [
    "market",
    "lab",
    "ruins",
    "incident",
    "artifact",
];

export const EMPTY_PLANET_TILE_TYPES: readonly ExploreTileType[] = [
    "cache",
    "core_sample",
    "ruins",
    "hazard",
    "artifact",
    "signal",
];

export const getTileTypesFor = (isEmptyPlanet: boolean) =>
    isEmptyPlanet ? EMPTY_PLANET_TILE_TYPES : POPULATED_TILE_TYPES;

// ─── Клетки необитаемых планет ────────────────────────────────────────────

/** Схрон: чей-то брошенный груз. Платит трюмом, а не кредитами */
export const EXPEDITION_CACHE_GOODS = [
    "water",
    "food",
    "medicine",
    "spares",
] as const;
export const EXPEDITION_CACHE_QTY_MIN = 4;
export const EXPEDITION_CACHE_QTY_MAX = 9;

/** Керн: порода под ногами. В отличие от лаборатории зависит от типа планеты */
export const EXPEDITION_CORE_SAMPLE_MIN = 2;
export const EXPEDITION_CORE_SAMPLE_MAX = 4;

const CORE_SAMPLE_DEFAULT: ResearchResourceType = "rare_minerals";

/**
 * Что даёт керн на каждом типе планеты. Ради этого клетка и заменила
 * лабораторию: на планете без расы лаборатория всегда отдавала tech_salvage,
 * то есть тип планеты не значил ничего.
 */
const CORE_SAMPLE_RESOURCES: Partial<Record<PlanetType, ResearchResourceType>> = {
    Вулканическая: "energy_samples",
    Приливная: "energy_samples",
    Радиоактивная: "energy_samples",
    Кристаллическая: "quantum_crystals",
    "Планета-кольцо": "quantum_crystals",
    Лесная: "alien_biology",
    Тропическая: "alien_biology",
    Океаническая: "alien_biology",
    "Разрушенная войной": "ancient_data",
    Ледяная: "void_membrane",
    Арктическая: "void_membrane",
};

export function getCoreSampleResource(
    planetType?: PlanetType,
): ResearchResourceType {
    return (
        (planetType && CORE_SAMPLE_RESOURCES[planetType]) ?? CORE_SAMPLE_DEFAULT
    );
}

/**
 * Природная опасность. Зеркало инцидента: инцидент — это местные, и его
 * гасят стрелки; опасность — это среда, и её гасят учёные, которые знают,
 * куда не наступать. Бьёт сильнее, потому что уклониться от неё труднее.
 */
export const EXPEDITION_HAZARD_DAMAGE_MIN = 25;
export const EXPEDITION_HAZARD_DAMAGE_MAX = 42;
export const EXPEDITION_HAZARD_MORALE_LOSS = 10;
export const EXPEDITION_HAZARD_SCIENTIST_REDUCTION = 0.3;

/** Сигнал: платит не ресурсом, а знанием — подсвечивает клетки вокруг */
export const EXPEDITION_SIGNAL_PEEKS = 3;
