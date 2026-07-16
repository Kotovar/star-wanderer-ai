import type { Goods } from "./goods";
import type { ResearchResourceType } from "./research";

// ─── Gas Giant Dive ───────────────────────────────────────────────────────────

export type DiveDepth = 1 | 2 | 3 | 4;

export interface DiveEventChoice {
    labelKey: string;
    rewards: { type: ResearchResourceType; quantity: number }[];
    damageChance?: number; // 0–100 %
    damageMin?: number;
    damageMax?: number;
    probeLossChance?: number; // 0–100 % chance the probe is destroyed, ending the dive
}

export interface DiveEvent {
    titleKey: string;
    descKey: string;
    choices: DiveEventChoice[];
}

export interface DiveRewards {
    alien_biology: number;
    rare_minerals: number;
    void_membrane: number;
}

export interface DiveState {
    locationId: string;
    currentDepth: DiveDepth;
    rewards: DiveRewards;
    currentEvent: DiveEvent | null;
    finished: boolean;
}

export type ExploreTileType =
    | "market"
    | "lab"
    | "ruins"
    | "incident"
    | "artifact";

export interface ExploreTile {
    type: ExploreTileType;
    revealed: boolean;
    peeked?: boolean; // подсмотрен через сканирование (тип виден, эффект не применён)
    x: number; // 0–4
    y: number; // 0–4
}

export interface RuinsChoice {
    labelKey: string; // i18n key
    rewardType:
        | "credits"
        | "research_resource"
        | "trade_good"
        | "artifact"
        | "nothing";
    rewardValue?: number;
    rewardResourceType?: ResearchResourceType;
    rewardGoodId?: Goods;
    riskType?: "crew_damage";
    riskValue?: number;
}

export interface RuinsEvent {
    titleKey: string;
    descKey: string;
    choices: RuinsChoice[];
}

export type RuinsDepth = 0 | 1 | 2;
export type ExpeditionScanMode = "scientist" | "orbital";

/** Краткая сводка исхода выбора в руинах — показывается игроку перед закрытием. */
export interface RuinsOutcome {
    summary: string;
    kind: "good" | "bad" | "neutral";
}

export interface ExpeditionReward {
    credits: number;
    tradeGoods: { id: Goods; quantity: number }[];
    researchResources: { type: ResearchResourceType; quantity: number }[];
    artifactFound: string | null; // artifact id
}

export interface ExpeditionState {
    planetId: string;
    grid: ExploreTile[]; // flat array of 25 tiles, index = y*5+x
    apTotal: number;
    apRemaining: number;
    stepApCost: number; // стоимость открытия клетки, старые сохранения считаются как 1 AP
    revealedCount: number;
    scansRemaining: number; // доступные сканирования (от учёных в отряде)
    orbitalScanAvailable: boolean; // один дальний скан от корабельного сканера
    activeRuinsEvent: RuinsEvent | null;
    ruinsOutcome: RuinsOutcome | null; // исход последнего выбора в руинах
    ruinsDepth: RuinsDepth; // дополнительные камеры в текущих руинах
    pendingTileIndex: number | null; // tile waiting for ruins choice resolution
    rewards: ExpeditionReward;
    finished: boolean;
    crewIds: number[]; // crew members sent on expedition
}
