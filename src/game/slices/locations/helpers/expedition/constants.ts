import type { PlanetType } from "@/game/types/planets";

type ExpeditionEnvironment = {
    icon: string;
    labelKey: "volcanic" | "ice" | "ocean";
    apCost?: number;
    stepDamage?: number;
    artifactWeightBonus?: number;
};

export const EXPEDITION_PLANET_ENVIRONMENTS: Partial<
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
export const EXPEDITION_RUINS_RISK_PER_DEPTH = 8;

export function getRuinsDepthRewardMultiplier(depth: number): number {
    return depth + 1;
}

export function getRuinsDepthDamage(depth: number): number {
    return depth * EXPEDITION_RUINS_RISK_PER_DEPTH;
}

// Индекс центральной клетки — зона высадки, точка старта исследования.
export const EXPEDITION_START_INDEX = Math.floor(EXPEDITION_TILE_COUNT / 2);

// Покрытие: разведчик даёт +1 AP (эффективная навигация по поверхности).
export const EXPEDITION_SCOUT_AP_BONUS = 1;

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
