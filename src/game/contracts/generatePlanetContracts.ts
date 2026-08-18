import type { ArtifactRarity } from "@/game/types/artifacts";
import type { Contract, RaceId, Sector } from "@/game/types";
import { TRADE_GOODS } from "@/game/constants/goods";
import { PLANET_TYPES } from "@/game/constants/planets";
import { getTierPriceMultiplier } from "@/game/slices/trade/constants";
import { typedKeys } from "@/lib/utils";
import { shuffle } from "@/game/utils/shuffle";
import { DELIVERY_GOODS, EXPEDITION_DISCOVERIES } from "../constants/contracts";
import { CONTRACT_REWARDS as REWARD } from "./rewards";
import { getGeneratedContractTimeLimit } from "./contractDeadline";
import type { RunProfile } from "../galaxy/runProfiles";
import {
    FRONTIER_CONTRACT_TYPES,
    type ContractGenerationContext,
} from "./frontierContracts";
import {
    FACTION_DELIVERY_CHANCE,
    getFactionDeliveryContext,
} from "./factionDelivery";
import { getReputationLevel } from "@/game/types/reputation";

// ─────────────────────────────────────────────────────────────────────────────
// Reward scaling constants (index = tier - 1)
// ─────────────────────────────────────────────────────────────────────────────
/** Кол-во мембран для gas_dive по тирам */
const GAS_DIVE_MEMBRANES = {
    min:   [2, 4, 7],
    range: [2, 3, 4],
} as const;

/** Количество тонн груза для delivery по тирам */
const DELIVERY_QTY_BY_TIER = [10, 20, 30] as const;

/** Минимальное и диапазон кол-ва единиц для supply_run по тирам */
const SUPPLY_RUN_QTY = {
    min:   [8, 15, 22],
    range: [10, 13, 16],
} as const;

/** Множитель цены закупки на станции (от basePrice) */
const STATION_BUY_PRICE_MULT = 0.4;

/** Множитель прибыли для supply_run по тирам */
const SUPPLY_RUN_TIER_MULT = [1.3, 1.4, 1.5] as const;

/** Кол-во целевых секторов для xenosymbiont по тирам (tier1→2, tier2→3, tier3→4) */
const XENO_TARGET_SECTORS_BY_TIER = [2, 3, 4] as const;

/** Минимум и диапазон аномалий для research по тирам */
const RESEARCH_ANOMALIES = {
    min:   [1, 2, 3],
    range: [2, 2, 2],
} as const;

const getEnemyTargetSectors = (
    sector: Sector,
    allSectors: Sector[],
): Sector[] =>
    allSectors.filter(
        (candidate) =>
            candidate.id !== sector.id &&
            candidate.tier < 4 &&
            candidate.locations.some(
                (location) => location.type === "enemy" && !location.defeated,
            ),
    );

export const generateCombatContract = (
    sector: Sector,
    planetId: string,
    allSectors: Sector[],
): Contract | null => {
    const targets = getEnemyTargetSectors(sector, allSectors);
    if (targets.length === 0) return null;
    const target = targets[Math.floor(Math.random() * targets.length)];

    return {
        id: `c-${planetId}-${Date.now()}-${Math.random()}`,
        type: "combat",
        desc: "contracts.desc_combat_generic",
        sectorId: target.id,
        sectorName: target.name,
        sourcePlanetId: planetId,
        sourceSectorName: sector.name,
        reward: REWARD.combat.base + Math.floor(Math.random() * REWARD.combat.range),
    };
};

export const generateBountyContract = (
    sector: Sector,
    planetId: string,
    allSectors: Sector[],
    sourceReputation = 0,
): Contract | null => {
    const targets = getEnemyTargetSectors(sector, allSectors);
    if (targets.length === 0) return null;
    const target = targets[Math.floor(Math.random() * targets.length)];
    const enemies = target.locations.filter(
        (location) => location.type === "enemy" && !location.defeated,
    );
    const enemy = enemies[Math.floor(Math.random() * enemies.length)];
    const threat = enemy.threat ?? 1;
    const normalReward =
        REWARD.bounty.baseFlat +
        threat * REWARD.bounty.threatMult +
        Math.floor(Math.random() * (threat * REWARD.bounty.threatMult));
    const isFriendlySource = ["friendly", "allied"].includes(
        getReputationLevel(sourceReputation),
    );

    return {
        id: `c-${planetId}-${Date.now()}-${Math.random()}`,
        type: "bounty",
        desc: "contracts.desc_bounty_generic",
        targetThreat: threat,
        sourcePlanetId: planetId,
        sourceSectorName: sector.name,
        targetSector: target.id,
        targetSectorName: target.name,
        timeLimit: getGeneratedContractTimeLimit(
            "bounty",
            sector.tier ?? 1,
            target.tier ?? sector.tier ?? 1,
        ),
        reward: isFriendlySource ? Math.floor(normalReward * 1.25) : normalReward,
        ...(isFriendlySource
            ? { bountyTier: "friendly" as const, reputationReward: 4 }
            : {}),
    };
};

// Generate planet contracts with race-specific quests
export const generatePlanetContracts = (
    planetType: string,
    sector: Sector,
    planetId: string,
    sectorIdx: number,
    allSectors: Sector[],
    dominantRace?: RaceId,
    profile?: RunProfile | null,
    _context?: ContractGenerationContext,
): Contract[] => {
    const context = _context ?? { canOfferCombat: true, allowFrontier: false };
    const contracts: Contract[] = [];
    const numContracts = Math.floor(Math.random() * 2) + 1;

    // Only other sectors for targets (exclude tier 4 sectors)
    const availableSectors = allSectors.filter(
        (s) => s.id !== sector.id && s.tier < 4,
    );
    const scannablePlanets = allSectors
        .filter((candidateSector) => (candidateSector.tier ?? 1) < 4)
        .flatMap((candidateSector) =>
            candidateSector.locations.filter(
                (location) => location.type === "planet",
            ),
        );

    if (availableSectors.length === 0) return contracts;

    // ═══════════════════════════════════════════════════════════════
    // RACE-SPECIFIC UNIQUE QUESTS
    // Each race has one unique quest that only they can offer
    // ═══════════════════════════════════════════════════════════════
    const raceQuests: Record<RaceId, () => Contract | null> = {
        human: () => {
            // Humans: Diplomatic mission - deliver a message to another human planet
            const tier = sector.tier ?? 1;
            const humanPlanets = allSectors
                .filter((s) => s.tier < 4)
                .flatMap((s) =>
                    s.locations.filter(
                        (l) =>
                            l.type === "planet" &&
                            !l.isEmpty &&
                            l.dominantRace === "human" &&
                            l.id !== planetId,
                    ),
                );
            if (humanPlanets.length === 0) return null;
            const target =
                humanPlanets[Math.floor(Math.random() * humanPlanets.length)];
            const targetSector = allSectors.find((s) =>
                s.locations.some((l) => l.id === target.id),
            );
            return {
                id: `c-${planetId}-human-${Date.now()}-${Math.random()}`,
                type: "diplomacy",
                desc: "contracts.desc_diplomacy_human",
                targetSector: targetSector?.id,
                targetSectorName: targetSector?.name,
                targetPlanetId: target.id,
                targetPlanetName: target.name,
                targetPlanetType: target.planetType,
                sourcePlanetId: planetId,
                sourceSectorName: sector.name,
                requiredRace: "human",
                isRaceQuest: true,
                timeLimit: 15,
                reward:
                    REWARD.human.base[tier - 1] +
                    Math.floor(Math.random() * REWARD.human.range[tier - 1]),
            };
        },

        synthetic: () => {
            // Synthetics: Tech research - complete a technology of matching tier
            const tier = sector.tier ?? 1;
            // Tier 1 sector → any tech (tier 1+), tier 2 → tier 2+, tier 3+ → tier 3+
            const requiredTechTier = Math.min(tier, 3);
            return {
                id: `c-${planetId}-synth-${Date.now()}-${Math.random()}`,
                type: "research",
                desc: "contracts.desc_research_synth",
                sourcePlanetId: planetId,
                sourceSectorName: sector.name,
                requiresTechResearch: true,
                requiredTechTier,
                requiredRace: "synthetic",
                isRaceQuest: true,
                reward:
                    REWARD.synthetic.base[tier - 1] +
                    Math.floor(Math.random() * REWARD.synthetic.range[tier - 1]),
            };
        },

        xenosymbiont: () => {
            // Xenosymbionts: Bio-scan - visit sectors to collect biological samples (scales with tier)
            const tier = sector.tier ?? 1;
            const numTargets = Math.min(XENO_TARGET_SECTORS_BY_TIER[tier - 1], availableSectors.length);
            const targets = shuffle(availableSectors).slice(0, numTargets);
            return {
                id: `c-${planetId}-xeno-${Date.now()}-${Math.random()}`,
                type: "patrol",
                desc: "contracts.desc_patrol_xeno",
                targetSectors: targets.map((t) => t.id),
                targetSectorNames: targets.map((t) => t.name).join(", "),
                visitedSectors: [],
                sourcePlanetId: planetId,
                sourceSectorName: sector.name,
                requiredRace: "xenosymbiont",
                isRaceQuest: true,
                timeLimit: 15,
                reward:
                    REWARD.xenosymbiont.base[tier - 1] +
                    Math.floor(Math.random() * REWARD.xenosymbiont.range[tier - 1]),
            };
        },

        krylorian: () => {
            // Krylorians: Honor duel - clear all enemies in a sector matching source tier
            const tier = sector.tier ?? 1;
            const sameTierSectors = availableSectors.filter(
                (s) =>
                    s.tier === tier &&
                    s.locations.some((l) => l.type === "enemy"),
            );
            if (sameTierSectors.length === 0) return null;
            const tgt =
                sameTierSectors[
                    Math.floor(Math.random() * sameTierSectors.length)
                ];
            // Much higher reward — must clear ALL enemies, not just one
            const reward =
                REWARD.krylorian.base[tier - 1] +
                Math.floor(Math.random() * REWARD.krylorian.range[tier - 1]);
            return {
                id: `c-${planetId}-kryl-${Date.now()}-${Math.random()}`,
                type: "combat",
                desc: "contracts.desc_bounty_kryl",
                sectorId: tgt.id,
                sectorName: tgt.name,
                sourcePlanetId: planetId,
                sourceSectorName: sector.name,
                requiredRace: "krylorian",
                isRaceQuest: true,
                timeLimit: 15,
                reward,
            };
        },

        voidborn: () => {
            // Voidborn: Void exploration - enter a storm to collect void energy
            const tier = sector.tier ?? 1;
            const requiredStormIntensity = tier;
            const stormTargets = availableSectors.flatMap((candidateSector) =>
                candidateSector.locations
                    .filter(
                        (location) =>
                            location.type === "storm" &&
                            (location.stormIntensity ?? 1) >=
                                requiredStormIntensity,
                    )
                    .map((storm) => ({ sector: candidateSector, storm })),
            );
            if (stormTargets.length === 0) return null;
            const target =
                stormTargets[Math.floor(Math.random() * stormTargets.length)];
            const rewardBase = REWARD.voidborn.base[tier - 1];
            const rewardRange = REWARD.voidborn.range[tier - 1];
            return {
                id: `c-${planetId}-void-${Date.now()}-${Math.random()}`,
                type: "rescue",
                desc: "contracts.desc_rescue_void",
                sectorId: target.sector.id,
                sectorName: target.sector.name,
                targetLocationId: target.storm.id,
                stormName: target.storm.name,
                sourcePlanetId: planetId,
                sourceSectorName: sector.name,
                requiresVisit: 1,
                visited: 0,
                requiredRace: "voidborn",
                isRaceQuest: true,
                timeLimit: 15,
                requiredStormIntensity,
                reward: rewardBase + Math.floor(Math.random() * rewardRange),
            };
        },

        crystalline: () => {
            // Crystallines: Artifact hunt - find and research an artifact
            const tier = sector.tier ?? 1;
            const requiredRarities: ArtifactRarity[] =
                tier === 1
                    ? ["rare", "legendary", "mythic", "cursed"]
                    : tier === 2
                      ? ["legendary", "mythic", "cursed"]
                      : ["mythic", "cursed"];
            return {
                id: `c-${planetId}-crys-${Date.now()}-${Math.random()}`,
                type: "mining",
                desc: "contracts.desc_mining_crystal",
                sourcePlanetId: planetId,
                sourceSectorName: sector.name,
                requiredRace: "crystalline",
                isRaceQuest: true,
                reward:
                    REWARD.crystalline.base[tier - 1] +
                    Math.floor(Math.random() * REWARD.crystalline.range[tier - 1]),
                requiredRarities,
            };
        },
    };

    // Add race-specific quest (30% chance, but guaranteed if no other contracts)
    if (dominantRace && Math.random() < 0.3) {
        const raceQuest = raceQuests[dominantRace]?.();
        if (
            raceQuest &&
            (context.canOfferCombat ||
                (raceQuest.type !== "combat" && raceQuest.type !== "bounty"))
        ) {
            contracts.push(raceQuest);
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // STANDARD QUESTS (available to all races)
    // ═══════════════════════════════════════════════════════════════
    const standardQuests = [
        {
            type: "scan_planet" as const,
            gen: (): Contract | null => {
                const tier = sector.tier ?? 1;
                const requiresVisit = Math.min(tier, 3);
                const availableTypes = PLANET_TYPES.filter(
                    (type) =>
                        type !== planetType &&
                        scannablePlanets.filter(
                            (location) => location.planetType === type,
                        ).length >= requiresVisit,
                );
                if (availableTypes.length === 0) return null;
                const targetType =
                    availableTypes[
                        Math.floor(Math.random() * availableTypes.length)
                    ];

                // Find source planet name
                const sourcePlanet = sector.locations.find(
                    (l) => l.type === "planet" && l.id === planetId,
                );

                const reward =
                    REWARD.scan_planet.base[tier - 1] +
                    Math.floor(Math.random() * REWARD.scan_planet.range[tier - 1]);

                return {
                    id: `c-${planetId}-scan-${Date.now()}-${Math.random()}`,
                    type: "scan_planet",
                    desc: "contracts.desc_scan",
                    planetType: targetType,
                    sourcePlanetId: planetId,
                    sourcePlanetName: sourcePlanet?.name,
                    sourceSectorName: sector.name,
                    sourceType: "planet",
                    requiresVisit,
                    visited: 0,
                    requiresScanner: true,
                    reward,
                };
            },
        },
        {
            type: "supply_run" as const,
            gen: (): Contract | null => {
                // Supply run - deliver goods TO the source planet
                const goodsKeys = typedKeys(TRADE_GOODS);
                const cargoKey =
                    goodsKeys[Math.floor(Math.random() * goodsKeys.length)];
                const cargo = TRADE_GOODS[cargoKey];
                const tier = sector.tier ?? 1;
                const quantity =
                    SUPPLY_RUN_QTY.min[tier - 1] +
                    Math.floor(Math.random() * SUPPLY_RUN_QTY.range[tier - 1]);
                // Закупка на станциях дорожает с тиром — награда масштабируется той же ставкой
                const stationBuyPrice = Math.floor(
                    cargo.basePrice * getTierPriceMultiplier(tier) * STATION_BUY_PRICE_MULT,
                );
                const reward = Math.floor(stationBuyPrice * quantity * SUPPLY_RUN_TIER_MULT[tier - 1]);

                // Find the actual planet name from the sector
                const sourcePlanet = sector.locations.find(
                    (l) => l.type === "planet" && l.id === planetId,
                );
                const sourcePlanetName = sourcePlanet?.name || sector.name;

                return {
                    id: `c-${planetId}-supply-${Date.now()}-${Math.random()}`,
                    type: "supply_run",
                    desc: "contracts.name_supply",
                    cargo: cargoKey,
                    quantity,
                    sourcePlanetId: planetId,
                    sourceName: sourcePlanetName,
                    sourceSectorName: sector.name,
                    sourceType: "planet",
                    reward,
                };
            },
        },
        {
            type: "delivery" as const,
            gen: (): Contract | null => {
                const tgtSector =
                    availableSectors[
                        Math.floor(Math.random() * availableSectors.length)
                    ];
                const goodsKeys = typedKeys(DELIVERY_GOODS);
                const cargoKey =
                    goodsKeys[Math.floor(Math.random() * goodsKeys.length)];

                // Pick a specific destination: inhabited planet, station, or friendly ship
                const validDestinations = tgtSector.locations.filter(
                    (l) =>
                        (l.type === "planet" && !l.isEmpty) ||
                        l.type === "station" ||
                        (l.type === "friendly_ship" && !l.defeated),
                );

                if (validDestinations.length === 0) return null;

                const dest =
                    validDestinations[
                        Math.floor(Math.random() * validDestinations.length)
                    ];
                const destType =
                    dest.type === "planet"
                        ? "planet"
                        : dest.type === "station"
                          ? "station"
                          : "ship";
                const localRace =
                    dest.type === "planet" ? dest.dominantRace : undefined;
                const factionDelivery =
                    !context.allowFrontier &&
                    dominantRace !== undefined &&
                    dest.type === "planet" &&
                    !dest.isEmpty &&
                    localRace !== undefined &&
                    localRace !== dominantRace &&
                    Math.random() < FACTION_DELIVERY_CHANCE
                        ? {
                              localRace,
                              context: getFactionDeliveryContext(cargoKey),
                          }
                        : undefined;

                const tier = sector.tier ?? 1;
                const quantity = DELIVERY_QTY_BY_TIER[tier - 1];
                const rewardBase = REWARD.delivery.base[tier - 1];
                const rewardRange = REWARD.delivery.range[tier - 1];

                return {
                    id: `c-${planetId}-${Date.now()}-${Math.random()}`,
                    type: "delivery",
                    desc: "contracts.name_delivery",
                    cargo: cargoKey, // Store the key, not the name
                    quantity,
                    targetSector: tgtSector.id,
                    targetSectorName: tgtSector.name,
                    targetLocationId: dest.id,
                    targetLocationName: dest.name,
                    targetLocationType: destType as
                        | "planet"
                        | "station"
                        | "ship",
                    sourcePlanetId: planetId,
                    sourceSectorName: sector.name,
                    sourceType: "planet",
                    ...(factionDelivery ? { factionDelivery } : {}),
                    timeLimit: getGeneratedContractTimeLimit(
                        "delivery",
                        tier,
                        tgtSector.tier ?? tier,
                    ),
                    reward: rewardBase + Math.floor(Math.random() * rewardRange),
                };
            },
        },
        {
            type: "combat" as const,
            gen: (): Contract | null =>
                generateCombatContract(sector, planetId, allSectors),
        },
        {
            type: "research" as const,
            gen: (): Contract | null => {
                const tier = sector.tier ?? 1;
                const requiresAnomalies =
                    RESEARCH_ANOMALIES.min[tier - 1] +
                    Math.floor(Math.random() * RESEARCH_ANOMALIES.range[tier - 1]);
                const availableAnomalies = allSectors
                    .filter((candidateSector) => (candidateSector.tier ?? 1) < 4)
                    .flatMap((candidateSector) => candidateSector.locations)
                    .filter((location) => location.type === "anomaly");
                if (availableAnomalies.length < requiresAnomalies) return null;
                const rewardBase = REWARD.research.base[tier - 1];
                const rewardRange = REWARD.research.range[tier - 1];
                return {
                    id: `c-${planetId}-${Date.now()}-${Math.random()}`,
                    type: "research",
                    desc: "contracts.desc_research_generic",
                    sectorId: undefined,
                    sectorName: "любой",
                    sourcePlanetId: planetId,
                    sourceSectorName: sector.name,
                    requiresAnomalies,
                    visitedAnomalies: 0,
                    reward: rewardBase + Math.floor(Math.random() * rewardRange),
                };
            },
        },
        {
            type: "bounty" as const,
            gen: (): Contract | null =>
                generateBountyContract(
                    sector,
                    planetId,
                    allSectors,
                    context.sourceReputation,
                ),
        },
        {
            type: "expedition_survey" as const,
            gen: (): Contract | null => {
                // Find sectors that have inhabited (non-empty) planets other than the source
                const candidatePlanets = availableSectors.flatMap((s) =>
                    s.locations
                        .filter(
                            (l) =>
                                l.type === "planet" &&
                                !l.isEmpty &&
                                !l.expeditionCompleted,
                        )
                        .map((l) => ({ planet: l, sector: s })),
                );
                if (candidatePlanets.length === 0) return null;

                const pick = candidatePlanets[Math.floor(Math.random() * candidatePlanets.length)];
                const tier = sector.tier ?? 1;
                const requiredDiscoveries = EXPEDITION_DISCOVERIES[tier - 1];
                const sourcePlanet = sector.locations.find(
                    (l) => l.type === "planet" && l.id === planetId,
                );

                return {
                    id: `c-${planetId}-exped-${Date.now()}-${Math.random()}`,
                    type: "expedition_survey",
                    desc: "contracts.desc_expedition_survey",
                    sourcePlanetId: planetId,
                    sourcePlanetName: sourcePlanet?.name,
                    sourceSectorName: sector.name,
                    sourceType: "planet",
                    targetPlanetId: pick.planet.id,
                    targetPlanetName: pick.planet.name,
                    targetSector: pick.sector.id,
                    targetSectorName: pick.sector.name,
                    requiredDiscoveries,
                    expeditionDone: false,
                    timeLimit: getGeneratedContractTimeLimit(
                        "expedition_survey",
                        tier,
                        pick.sector.tier ?? tier,
                    ),
                    reward:
                        REWARD.expedition_survey.base[tier - 1] +
                        Math.floor(Math.random() * REWARD.expedition_survey.range[tier - 1]),
                };
            },
        },
        {
            type: "derelict_recovery" as const,
            gen: (): Contract | null => {
                const candidates = availableSectors.flatMap((candidateSector) =>
                    candidateSector.locations
                        .filter(
                            (location) =>
                                location.type === "derelict_ship" &&
                                !location.derelictExplored,
                        )
                        .map((location) => ({ location, sector: candidateSector })),
                );
                if (candidates.length === 0) return null;

                const target =
                    candidates[Math.floor(Math.random() * candidates.length)];
                const tier = sector.tier ?? 1;
                const sourcePlanet = sector.locations.find(
                    (location) =>
                        location.type === "planet" && location.id === planetId,
                );

                return {
                    id: `c-${planetId}-derelict-${Date.now()}-${Math.random()}`,
                    type: "derelict_recovery",
                    desc: "contracts.desc_derelict_recovery",
                    sourcePlanetId: planetId,
                    sourcePlanetName: sourcePlanet?.name,
                    sourceSectorName: sector.name,
                    sourceType: "planet",
                    targetLocationId: target.location.id,
                    targetSector: target.sector.id,
                    targetSectorName: target.sector.name,
                    timeLimit: getGeneratedContractTimeLimit(
                        "derelict_recovery",
                        tier,
                        target.sector.tier ?? tier,
                    ),
                    reward:
                        REWARD.derelict_recovery.base[tier - 1] +
                        Math.floor(
                            Math.random() *
                                REWARD.derelict_recovery.range[tier - 1],
                        ),
                };
            },
        },
        {
            type: "cleanse_curse" as const,
            gen: (): Contract | null => {
                // Target any Crystal Hydra found in the galaxy — the only creature
                // whose resonance is attuned enough to lift an artifact's curse.
                const candidates = allSectors
                    .filter((candidateSector) => (candidateSector.tier ?? 1) < 4)
                    .flatMap((candidateSector) =>
                        candidateSector.locations
                            .filter(
                                (location) =>
                                    location.type === "space_monster" &&
                                    location.spaceMonsterType === "crystal_hydra" &&
                                    location.spaceMonsterResolved !== "hunted",
                            )
                            .map((location) => ({ location, sector: candidateSector })),
                    );
                if (candidates.length === 0) return null;

                const target =
                    candidates[Math.floor(Math.random() * candidates.length)];
                const tier = sector.tier ?? 1;
                const sourcePlanet = sector.locations.find(
                    (location) =>
                        location.type === "planet" && location.id === planetId,
                );
                const rewardBase = REWARD.cleanse_curse.base[tier - 1];
                const rewardRange = REWARD.cleanse_curse.range[tier - 1];

                return {
                    id: `c-${planetId}-cleanse-${Date.now()}-${Math.random()}`,
                    type: "cleanse_curse",
                    desc: "contracts.desc_cleanse_curse",
                    sourcePlanetId: planetId,
                    sourcePlanetName: sourcePlanet?.name,
                    sourceSectorName: sector.name,
                    sourceType: "planet",
                    targetLocationId: target.location.id,
                    targetSector: target.sector.id,
                    targetSectorName: target.sector.name,
                    reward: rewardBase + Math.floor(Math.random() * rewardRange),
                };
            },
        },
        {
            type: "gas_dive" as const,
            gen: (): Contract | null => {
                // Only generate if there are gas planets anywhere in reachable sectors
                const hasGasPlanets = [...allSectors.filter((s) => s.tier < 4)].some((s) =>
                    s.locations.some((l) => l.type === "gas_giant"),
                );
                if (!hasGasPlanets) return null;

                const tier = sector.tier ?? 1;
                const requiredMembranes =
                    GAS_DIVE_MEMBRANES.min[tier - 1] +
                    Math.floor(Math.random() * GAS_DIVE_MEMBRANES.range[tier - 1]);
                const rewardBase = REWARD.gas_dive.base[tier - 1];
                const rewardRange = REWARD.gas_dive.range[tier - 1];

                const sourcePlanet = sector.locations.find(
                    (l) => l.type === "planet" && l.id === planetId,
                );

                return {
                    id: `c-${planetId}-gdive-${Date.now()}-${Math.random()}`,
                    type: "gas_dive",
                    desc: "contracts.desc_gas_dive",
                    sourcePlanetId: planetId,
                    sourcePlanetName: sourcePlanet?.name,
                    sourceSectorName: sector.name,
                    sourceType: "planet",
                    requiredMembranes,
                    collectedMembranes: 0,
                    reward: rewardBase + Math.floor(Math.random() * rewardRange),
                };
            },
        },
    ].filter(
        (quest) =>
            context.canOfferCombat ||
            (quest.type !== "combat" && quest.type !== "bounty"),
    );

    const remaining = [...standardQuests];
    const numNeeded = Math.max(1, numContracts - contracts.length);
    let generated = 0;
    while (generated < numNeeded && remaining.length > 0) {
        let roll = Math.random() * remaining.reduce(
            (total, quest) => total + (profile?.contractWeights[quest.type] ?? 1),
            0,
        );
        const index = remaining.findIndex((quest) => {
            roll -= profile?.contractWeights[quest.type] ?? 1;
            return roll <= 0;
        });
        const [quest] = remaining.splice(index >= 0 ? index : remaining.length - 1, 1);
        const contract = quest.gen();
        if (!contract) continue;
        contracts.push(
            dominantRace ? { ...contract, sourceDominantRace: dominantRace } : contract,
        );
        generated += 1;
    }

    if (context.allowFrontier && (sector.tier ?? 1) === 1) {
        const frontierOffer = contracts.find(
            (contract) =>
                !contract.isRaceQuest &&
                FRONTIER_CONTRACT_TYPES.includes(contract.type),
        );
        if (frontierOffer) frontierOffer.progressionTrack = "frontier";
    }

    return contracts;
};
