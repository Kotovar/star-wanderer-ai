import type { Goods } from "./goods";
import type { ResearchResourceType } from "./research";

export type ExploreTileType =
    | "market"
    | "lab"
    | "ruins"
    | "incident"
    | "artifact"
    | "exit";

export interface ExploreTile {
    type: ExploreTileType;
    revealed: boolean;
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
    revealedCount: number;
    activeRuinsEvent: RuinsEvent | null;
    pendingTileIndex: number | null; // tile waiting for ruins choice resolution
    rewards: ExpeditionReward;
    finished: boolean;
    crewIds: number[]; // crew members sent on expedition
}
