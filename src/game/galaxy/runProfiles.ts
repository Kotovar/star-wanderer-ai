import type { ContractType, GalaxyTierAll, LocationType } from "@/game/types";

export type RunProfileId =
    | "ancient_echo"
    | "war_spiral"
    | "broken_trade_lanes";

export type LocationWeightKey =
    | "station"
    | "friendlyShip"
    | "planet"
    | "enemyShip"
    | "asteroidBelt"
    | "storm"
    | "distressSignal"
    | "derelictShip"
    | "gasGiant"
    | "boss"
    | "anomaly"
    | "wreckField";

export interface RunProfile {
    readonly id: RunProfileId;
    readonly icon: string;
    readonly nameKey: string;
    readonly opportunityKey: string;
    readonly riskKey: string;
    readonly locationWeights: Readonly<Partial<Record<LocationWeightKey, number>>>;
    readonly contractWeights: Partial<Record<ContractType, number>>;
    readonly clusters: {
        readonly tiers: readonly GalaxyTierAll[];
        readonly sectorsPerTier: number;
        readonly types: readonly LocationType[];
    };
    readonly stationAnchorsByTier?: Partial<Record<GalaxyTierAll, number>>;
}

export const RUN_PROFILES = {
    ancient_echo: {
        id: "ancient_echo",
        icon: "◈",
        nameKey: "run_profiles.ancient_echo.name",
        opportunityKey: "run_profiles.ancient_echo.opportunity",
        riskKey: "run_profiles.ancient_echo.risk",
        locationWeights: { anomaly: 2.25, gasGiant: 1.5, station: 0.6 },
        contractWeights: { research: 3, expedition_survey: 3, gas_dive: 2 },
        clusters: { tiers: [1, 2, 3], sectorsPerTier: 2, types: ["anomaly", "anomaly", "gas_giant"] },
    },
    war_spiral: {
        id: "war_spiral",
        icon: "⚔",
        nameKey: "run_profiles.war_spiral.name",
        opportunityKey: "run_profiles.war_spiral.opportunity",
        riskKey: "run_profiles.war_spiral.risk",
        locationWeights: { enemyShip: 2, boss: 1.4, station: 0.85 },
        contractWeights: { combat: 3, bounty: 3 },
        clusters: { tiers: [1, 2, 3], sectorsPerTier: 2, types: ["enemy", "space_monster"] },
    },
    broken_trade_lanes: {
        id: "broken_trade_lanes",
        icon: "⌁",
        nameKey: "run_profiles.broken_trade_lanes.name",
        opportunityKey: "run_profiles.broken_trade_lanes.opportunity",
        riskKey: "run_profiles.broken_trade_lanes.risk",
        locationWeights: { station: 0, derelictShip: 2.4, distressSignal: 2, wreckField: 2 },
        contractWeights: { derelict_recovery: 3, delivery: 2, supply_run: 2 },
        clusters: { tiers: [1, 2, 3], sectorsPerTier: 2, types: ["derelict_ship", "distress_signal", "wreck_field"] },
        stationAnchorsByTier: { 1: 3, 2: 2, 3: 2, 4: 2 },
    },
} as const satisfies Record<RunProfileId, RunProfile>;

export const RUN_PROFILE_IDS = Object.keys(RUN_PROFILES) as RunProfileId[];

export const getRunProfile = (id: RunProfileId | null): RunProfile | null =>
    id ? RUN_PROFILES[id] : null;

export const pickRunProfileId = (): RunProfileId =>
    RUN_PROFILE_IDS[Math.floor(Math.random() * RUN_PROFILE_IDS.length)];
