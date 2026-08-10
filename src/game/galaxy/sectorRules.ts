import type { ActiveEffect, EffectPolarity, GalaxyTierAll, Sector } from "@/game/types";
import type { LocationWeightKey, RunProfileId } from "./runProfiles";

export const SECTOR_RULE_IDS = [
    "zero_field",
    "blind_zone",
    "fleet_graveyard",
    "resonance",
    "dead_drift",
    "trade_lane",
    "debris_belt",
    "anomaly_storm",
    "becalmed",
    "gravity_well",
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
    /** Сценарии, чей вес обнуляет обещание правила: там его нельзя ставить. */
    readonly excludeProfiles?: readonly RunProfileId[];
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
    trade_lane: {
        id: "trade_lane",
        nameKey: "sector_rules.trade_lane.name",
        descKey: "sector_rules.trade_lane.description",
        icon: "⇄",
        color: "#4ade80",
        polarity: "positive",
        tiers: [1, 2, 3],
        effects: [],
        // ensureStation и так кладёт станцию в каждый сектор, поэтому множитель
        // работает только «сверху гарантии» — ×3 давал прибавку в пределах шума.
        locationWeights: { station: 8, friendlyShip: 6, enemyShip: 0.5 },
        // В «разорванных торговых путях» вес станций равен 0, и ×3 остаётся
        // нулём: правило обещало бы станции, которых там не бывает.
        excludeProfiles: ["broken_trade_lanes"],
    },
    debris_belt: {
        id: "debris_belt",
        nameKey: "sector_rules.debris_belt.name",
        descKey: "sector_rules.debris_belt.description",
        icon: "∴",
        color: "#d6d3d1",
        polarity: "mixed",
        tiers: [1, 2, 3, 4],
        effects: [
            { type: "fuel_efficiency", value: -0.2 },
            { type: "combat_bonus", value: -0.15 },
        ],
        // Веса нормализуются к сумме 1, поэтому большой множитель на астероидах
        // съедает долю редких обломков — их множитель должен быть заметно выше.
        locationWeights: { asteroidBelt: 3, wreckField: 6 },
    },
    anomaly_storm: {
        id: "anomaly_storm",
        nameKey: "sector_rules.anomaly_storm.name",
        descKey: "sector_rules.anomaly_storm.description",
        icon: "✦",
        color: "#e879f9",
        polarity: "mixed",
        tiers: [2, 3, 4],
        effects: [
            { type: "shield_boost", value: -15 },
            { type: "artifact_hints", value: 1 },
        ],
        // anomaly — это ещё и fallback-корзина getLocation, а ensureMinAnomalies
        // подсыпает их в каждый сектор: базовая доля высокая, множитель нужен
        // больше, чем кажется по таблице.
        locationWeights: { anomaly: 6, gasGiant: 4 },
    },
    becalmed: {
        id: "becalmed",
        nameKey: "sector_rules.becalmed.name",
        descKey: "sector_rules.becalmed.description",
        icon: "≡",
        color: "#2dd4bf",
        polarity: "mixed",
        tiers: [1, 2, 3, 4],
        effects: [],
        // Ровно 0, а не «мало»: skipEnsure убирает только гарантию станции,
        // случайную он не запрещает, а описание обещает пустоту.
        locationWeights: { enemyShip: 0.2, storm: 0, station: 0 },
        skipEnsure: ["station"],
    },
    gravity_well: {
        id: "gravity_well",
        nameKey: "sector_rules.gravity_well.name",
        descKey: "sector_rules.gravity_well.description",
        icon: "⇓",
        color: "#f97316",
        polarity: "mixed",
        tiers: [2, 3, 4],
        effects: [
            { type: "fuel_efficiency", value: 0.3 },
            { type: "evasion_bonus", value: -0.1 },
        ],
        restrictions: { noWarp: true },
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

export const planSectorRules = (
    sectors: Sector[],
    profileId: RunProfileId | null = null,
): void => {
    const ruleCount = 4 + Math.floor(Math.random() * 2);
    const eligible = SECTOR_RULE_IDS.filter(
        (ruleId) =>
            !profileId || !getSectorRule(ruleId)?.excludeProfiles?.includes(profileId),
    );
    const ruleIds = shuffle(eligible).slice(0, ruleCount);
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

        // Правило без подходящего сектора просто не ставится: ронять генерацию
        // галактики из-за одной особенности нельзя.
        if (!sector) continue;

        sector.ruleId = ruleId;
        tierOneRulePlaced ||= sector.tier === 1;
    }
};
