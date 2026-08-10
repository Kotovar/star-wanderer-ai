import type { ActiveEffect, EffectPolarity, GalaxyTierAll, Sector } from "@/game/types";
import type { LocationWeightKey } from "./runProfiles";

export const SECTOR_RULE_IDS = [
    "zero_field",
    "blind_zone",
    "fleet_graveyard",
    "resonance",
    "dead_drift",
] as const;

export type SectorRuleId = typeof SECTOR_RULE_IDS[number];
export type SectorRestriction = "noWarp" | "noRepair" | "noScan";
export type SectorEnsureKey = "station" | "colonizedPlanet";

export interface SectorRule {
    readonly id: SectorRuleId;
    readonly nameKey: string;
    readonly descKey: string;
    readonly icon: string;
    readonly color: string;
    readonly polarity: EffectPolarity;
    readonly tiers: readonly GalaxyTierAll[];
    readonly effects: ActiveEffect["effects"];
    readonly restrictions?: Readonly<Partial<Record<SectorRestriction, true>>>;
    readonly locationWeights?: Readonly<Partial<Record<LocationWeightKey, number>>>;
    readonly skipEnsure?: readonly SectorEnsureKey[];
}

export const SECTOR_RULES = {
    zero_field: {
        id: "zero_field",
        nameKey: "sector_rules.zero_field.name",
        descKey: "sector_rules.zero_field.description",
        icon: "◌",
        color: "#7dd3fc",
        polarity: "negative",
        tiers: [2, 3, 4],
        effects: [],
        restrictions: { noWarp: true },
    },
    blind_zone: {
        id: "blind_zone",
        nameKey: "sector_rules.blind_zone.name",
        descKey: "sector_rules.blind_zone.description",
        icon: "◉",
        color: "#a78bfa",
        polarity: "mixed",
        tiers: [1, 2, 3, 4],
        effects: [{ type: "evasion_bonus", value: 0.15 }],
        restrictions: { noScan: true },
    },
    fleet_graveyard: {
        id: "fleet_graveyard",
        nameKey: "sector_rules.fleet_graveyard.name",
        descKey: "sector_rules.fleet_graveyard.description",
        icon: "⚰",
        color: "#94a3b8",
        polarity: "mixed",
        tiers: [1, 2, 3, 4],
        effects: [{ type: "artifact_hints", value: 1 }],
        restrictions: { noRepair: true },
        locationWeights: { derelictShip: 4, wreckField: 4, station: 0.2 },
        skipEnsure: ["station"],
    },
    resonance: {
        id: "resonance",
        nameKey: "sector_rules.resonance.name",
        descKey: "sector_rules.resonance.description",
        icon: "⌁",
        color: "#fb7185",
        polarity: "mixed",
        tiers: [2, 3, 4],
        effects: [
            { type: "combat_bonus", value: 0.25 },
            { type: "shield_boost", value: -25 },
        ],
    },
    dead_drift: {
        id: "dead_drift",
        nameKey: "sector_rules.dead_drift.name",
        descKey: "sector_rules.dead_drift.description",
        icon: "≈",
        color: "#fbbf24",
        polarity: "mixed",
        tiers: [2, 3, 4],
        effects: [{ type: "fuel_efficiency", value: -0.5 }],
        locationWeights: { distressSignal: 3, derelictShip: 2 },
    },
} as const satisfies Record<SectorRuleId, SectorRule>;

export const getSectorRule = (ruleId?: SectorRuleId): SectorRule | undefined =>
    ruleId ? SECTOR_RULES[ruleId] : undefined;

export const shouldSkipSectorEnsure = (
    sector: Pick<Sector, "ruleId">,
    ensure: SectorEnsureKey,
): boolean => getSectorRule(sector.ruleId)?.skipEnsure?.includes(ensure) ?? false;

const isReservedBossSector = (sector: Sector): boolean =>
    sector.locations.some(
        (location) =>
            location.bossId === "void_oracle" || location.bossId === "the_eternal",
    );

const shuffle = <T>(values: readonly T[]): T[] => {
    const result = [...values];
    for (let index = result.length - 1; index > 0; index -= 1) {
        const swapIndex = Math.floor(Math.random() * (index + 1));
        [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
    }
    return result;
};

export const planSectorRules = (sectors: Sector[]): void => {
    const ruleCount = 4 + Math.floor(Math.random() * 3);
    const shuffledRuleIds = shuffle(SECTOR_RULE_IDS);
    const ruleIds = Array.from(
        { length: ruleCount },
        (_, index) => shuffledRuleIds[index % shuffledRuleIds.length],
    );
    let tierOneRulePlaced = false;

    for (const ruleId of ruleIds) {
        const rule: SectorRule = SECTOR_RULES[ruleId];
        const candidates = sectors.filter(
            (sector) =>
                sector.id !== 0 &&
                !sector.ruleId &&
                sector.star.type !== "blackhole" &&
                !isReservedBossSector(sector) &&
                rule.tiers.includes(sector.tier) &&
                (sector.tier !== 1 || !tierOneRulePlaced),
        );
        const sector = candidates[Math.floor(Math.random() * candidates.length)];

        if (!sector) {
            throw new Error(`No eligible sector for rule ${ruleId}`);
        }

        sector.ruleId = ruleId;
        tierOneRulePlaced ||= sector.tier === 1;
    }
};
