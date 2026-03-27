import type { ArtifactRarity } from "@/game/types/artifacts";
import type { Contract, PlanetType, RaceId, Sector } from "@/game/types";
import { TRADE_GOODS } from "@/game/constants/goods";
import { typedKeys } from "@/lib/utils";
import { DELIVERY_GOODS } from "../constants/contracts";

// ─────────────────────────────────────────────────────────────────────────────
// Reward scaling constants (index = tier - 1)
// ─────────────────────────────────────────────────────────────────────────────
const REWARD = {
    human:       { base: [500, 800, 1300],   range: [200, 300, 400] },
    synthetic:   { base: [1400, 1800, 2200], range: [400, 500, 600] },
    xenosymbiont:{ base: [500, 700, 1000],   range: [200, 300, 400] },
    krylorian:   { base: [2000, 3000, 4000], range: [200, 1000, 2200] },
    voidborn:    { base: [700, 1000, 1400],  range: [400, 400, 400] },
    crystalline: { base: [800, 1300, 1800],  range: [600, 700, 800] },
    scan_planet: { base: [400, 600, 800],    range: [200, 200, 200] },
    research:    { base: [500, 800, 1200],   range: [300, 400, 600] },
    combat:      { base: 600,                range: 300 },
    bounty:      { threatMult: 300,          baseFlat: 300 },
    delivery:    { base: [200, 400, 700],    range: [200, 300, 400] },
    gas_dive:          { base: [600, 1000, 1500],  range: [200, 300, 500] },
    expedition_survey: { base: [700, 1100, 1700],  range: [300, 400, 500] },
} as const;

/** Кол-во мембран для gas_dive по тирам */
const GAS_DIVE_MEMBRANES = {
    min:   [2, 4, 7],
    range: [2, 3, 4],
} as const;

/** Мин. значимых клеток (руины+лаб+артефакт) для expedition_survey по тирам */
const EXPEDITION_DISCOVERIES = [3, 5, 7] as const;

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

// Generate planet contracts with race-specific quests
export const generatePlanetContracts = (
    planetType: string,
    sector: Sector,
    planetId: string,
    sectorIdx: number,
    allSectors: Sector[],
    dominantRace?: RaceId,
): Contract[] => {
    const contracts: Contract[] = [];
    const numContracts = Math.floor(Math.random() * 2) + 1;

    // Only other sectors for targets (exclude tier 4 sectors)
    const availableSectors = allSectors.filter(
        (s) => s.id !== sector.id && s.tier < 4,
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
                targetPlanetName: target.name,
                targetPlanetType: target.planetType,
                sourcePlanetId: planetId,
                sourceSectorName: sector.name,
                requiredRace: "human",
                isRaceQuest: true,
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
            const targets = availableSectors
                .sort(() => Math.random() - 0.5)
                .slice(0, numTargets);
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
                reward,
            };
        },

        voidborn: () => {
            // Voidborn: Void exploration - enter a storm to collect void energy
            const tier = sector.tier ?? 1;
            const requiredStormIntensity = tier;
            const stormSectors = availableSectors.filter((s) =>
                s.locations.some(
                    (l) =>
                        l.type === "storm" &&
                        (l.stormIntensity ?? 1) >= requiredStormIntensity,
                ),
            );
            if (stormSectors.length === 0) return null;
            const tgt =
                stormSectors[Math.floor(Math.random() * stormSectors.length)];
            const storm = tgt.locations.find(
                (l) =>
                    l.type === "storm" &&
                    (l.stormIntensity ?? 1) >= requiredStormIntensity,
            );
            const rewardBase = REWARD.voidborn.base[tier - 1];
            const rewardRange = REWARD.voidborn.range[tier - 1];
            return {
                id: `c-${planetId}-void-${Date.now()}-${Math.random()}`,
                type: "rescue",
                desc: "contracts.desc_rescue_void",
                sectorId: tgt.id,
                sectorName: tgt.name,
                stormName: storm?.name,
                sourcePlanetId: planetId,
                sourceSectorName: sector.name,
                requiresVisit: 1,
                visited: 0,
                requiredRace: "voidborn",
                isRaceQuest: true,
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
        if (raceQuest) contracts.push(raceQuest);
    }

    // ═══════════════════════════════════════════════════════════════
    // STANDARD QUESTS (available to all races)
    // ═══════════════════════════════════════════════════════════════
    const standardQuests = [
        {
            type: "scan_planet" as const,
            gen: (): Contract | null => {
                // Scan planet - find any planet of specified type in any sector
                const planetTypes: PlanetType[] = [
                    "Пустынная",
                    "Ледяная",
                    "Лесная",
                    "Вулканическая",
                    "Океаническая",
                    "Радиоактивная",
                    "Тропическая",
                    "Арктическая",
                    "Разрушенная войной",
                    "Планета-кольцо",
                    "Приливная",
                ];

                const availableTypes = planetTypes.filter(
                    (t) => t !== planetType,
                );
                const targetType =
                    availableTypes[
                        Math.floor(Math.random() * availableTypes.length)
                    ];

                // Find source planet name
                const sourcePlanet = sector.locations.find(
                    (l) => l.type === "planet" && l.id === planetId,
                );

                const tier = sector.tier ?? 1;
                const requiresVisit = Math.min(tier, 3);
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
                const stationBuyPrice = Math.floor(cargo.basePrice * STATION_BUY_PRICE_MULT);
                const reward = Math.floor(stationBuyPrice * quantity * SUPPLY_RUN_TIER_MULT[tier - 1]);

                // Find the actual planet name from the sector
                const sourcePlanet = sector.locations.find(
                    (l) => l.type === "planet" && l.id === planetId,
                );
                const sourcePlanetName = sourcePlanet?.name || sector.name;

                return {
                    id: `c-${planetId}-supply-${Date.now()}-${Math.random()}`,
                    type: "supply_run",
                    desc: `📦 Поставка: ${cargo.name}`,
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
                const cargoName = DELIVERY_GOODS[cargoKey].name;

                // Pick a specific destination: inhabited planet, station, or friendly ship
                const validDestinations = tgtSector.locations.filter(
                    (l) =>
                        (l.type === "planet" && !l.isEmpty) ||
                        l.type === "station" ||
                        l.type === "friendly_ship",
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

                const tier = sector.tier ?? 1;
                const quantity = DELIVERY_QTY_BY_TIER[tier - 1];
                const rewardBase = REWARD.delivery.base[tier - 1];
                const rewardRange = REWARD.delivery.range[tier - 1];

                return {
                    id: `c-${planetId}-${Date.now()}-${Math.random()}`,
                    type: "delivery",
                    desc: `📦 Доставка: ${cargoName}`,
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
                    reward: rewardBase + Math.floor(Math.random() * rewardRange),
                };
            },
        },
        {
            type: "combat" as const,
            gen: (): Contract | null => {
                // Find a sector that actually has enemies
                const sectorsWithEnemies = availableSectors.filter((s) =>
                    s.locations.some((l) => l.type === "enemy"),
                );
                if (sectorsWithEnemies.length === 0) return null;
                const tgt =
                    sectorsWithEnemies[
                        Math.floor(Math.random() * sectorsWithEnemies.length)
                    ];
                return {
                    id: `c-${planetId}-${Date.now()}-${Math.random()}`,
                    type: "combat",
                    desc: "contracts.desc_combat_generic",
                    sectorId: tgt.id,
                    sectorName: tgt.name,
                    sourcePlanetId: planetId,
                    sourceSectorName: sector.name,
                    reward: REWARD.combat.base + Math.floor(Math.random() * REWARD.combat.range),
                };
            },
        },
        {
            type: "research" as const,
            gen: (): Contract | null => {
                const tier = sector.tier ?? 1;
                const requiresAnomalies =
                    RESEARCH_ANOMALIES.min[tier - 1] +
                    Math.floor(Math.random() * RESEARCH_ANOMALIES.range[tier - 1]);
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
            gen: (): Contract | null => {
                // Find a sector with enemies
                const sectorsWithEnemies = availableSectors.filter((s) =>
                    s.locations.some((l) => l.type === "enemy"),
                );
                if (sectorsWithEnemies.length === 0) return null;
                const tgt =
                    sectorsWithEnemies[
                        Math.floor(Math.random() * sectorsWithEnemies.length)
                    ];
                // Pick an actual enemy from the sector and use its real threat
                const enemies = tgt.locations.filter(
                    (l) => l.type === "enemy",
                );
                const pickedEnemy =
                    enemies[Math.floor(Math.random() * enemies.length)];
                const threat = pickedEnemy.threat ?? 1;
                return {
                    id: `c-${planetId}-${Date.now()}-${Math.random()}`,
                    type: "bounty",
                    desc: "contracts.desc_bounty_generic",
                    targetThreat: threat,
                    sourcePlanetId: planetId,
                    sourceSectorName: sector.name,
                    targetSector: tgt.id,
                    targetSectorName: tgt.name,
                    reward:
                        REWARD.bounty.baseFlat +
                        threat * REWARD.bounty.threatMult +
                        Math.floor(Math.random() * (threat * REWARD.bounty.threatMult)),
                };
            },
        },
        {
            type: "expedition_survey" as const,
            gen: (): Contract | null => {
                // Find sectors that have inhabited (non-empty) planets other than the source
                const candidatePlanets = availableSectors.flatMap((s) =>
                    s.locations
                        .filter((l) => l.type === "planet" && !l.isEmpty)
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
                    reward:
                        REWARD.expedition_survey.base[tier - 1] +
                        Math.floor(Math.random() * REWARD.expedition_survey.range[tier - 1]),
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
    ];

    const shuffled = [...standardQuests].sort(() => Math.random() - 0.5);
    const numNeeded = Math.max(1, numContracts - contracts.length);
    for (let i = 0; i < Math.min(numNeeded, shuffled.length); i++) {
        const q = shuffled[i].gen();
        if (q) contracts.push(q);
    }

    return contracts;
};
