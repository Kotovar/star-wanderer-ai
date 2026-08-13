import { PLANET_TYPES } from "@/game/constants/planets";
import type { GalaxyTierAll, GalaxyTierBase, Sector } from "@/game/types";
import { bossDistribution } from "./bossDistribution";
import { ANOMALY_COLORS, MIN_REQUIREMENTS, STATION_CONFIG } from "./config";
import { STATION_TYPES } from "./consts";
import { getRandomRace, getDominantRaceForPlanet } from "@/game/races/utils";
import { getLocationNameKey } from "./generate";
import { shouldSkipSectorEnsure } from "./sectorRules";

/**
 * Обеспечивает минимальное количество аномалий в секторе
 */
export const ensureMinAnomalies = (
    sector: Sector,
    tier: GalaxyTierAll,
): void => {
    const anomalyCount = sector.locations.filter(
        (l) => l.type === "anomaly",
    ).length;

    if (anomalyCount >= MIN_REQUIREMENTS.anomalies) return;

    sector.locations.push({
        id: `${sector.id}-extra-anomaly`,
        type: "anomaly",
        name: "Аномалия",
        anomalyType: Math.random() < 0.5 ? "good" : "bad",
        anomalyTier: tier,
        anomalyColor: ANOMALY_COLORS[tier],
        requiresScientistLevel: tier,
    });
};

/**
 * Размещает уникальных обычных боссов после формирования чёрных дыр.
 */
export const ensureBosses = (sectors: Sector[], tier: GalaxyTierBase): void => {
    const required = { 1: 1, 2: 2, 3: 3 }[tier];
    const tierSectors = sectors.filter(
        (sector) =>
            sector.id !== 0 &&
            sector.tier === tier &&
            sector.star.type !== "blackhole",
    );
    let count = tierSectors.flatMap((sector) => sector.locations).filter(
        (location) => location.type === "boss",
    ).length;

    for (const sector of tierSectors) {
        if (count >= required) return;
        if (sector.locations.some((location) => location.type === "boss")) continue;

        const boss = bossDistribution.getRandomBossForTier(tier);
        if (!boss) return;

        bossDistribution.markBossAsUsed(boss.id);
        sector.locations.push({
            id: `${sector.id}-boss-${boss.id}`,
            type: "boss",
            name: boss.name,
            bossId: boss.id,
            bossType: boss.bossType,
            bossDefeated: false,
        });
        count += 1;
    }
};

/**
 * Обеспечивает наличие хотя бы одной колонизированной планеты
 */
export const ensureColonizedPlanet = (sector: Sector): void => {
    const colonizedCount = sector.locations.filter(
        (l) => l.type === "planet" && !l.isEmpty,
    ).length;

    if (colonizedCount >= MIN_REQUIREMENTS.colonizedPlanets) return;

    const emptyPlanetIdx = sector.locations.findIndex(
        (l) => l.type === "planet" && l.isEmpty,
    );

    if (emptyPlanetIdx >= 0) {
        const planet = sector.locations[emptyPlanetIdx];
        const planetType = planet.planetType || "Лесная";
        sector.locations[emptyPlanetIdx] = {
            ...planet,
            isEmpty: false,
            dominantRace: getDominantRaceForPlanet(planetType),
            population: 100 + Math.floor(Math.random() * 900),
            contracts: [],
        };
    } else {
        const planetType =
            PLANET_TYPES[Math.floor(Math.random() * PLANET_TYPES.length)];
        sector.locations.push({
            id: `${sector.id}-extra-colony`,
            type: "planet",
            name: getLocationNameKey("planet", sector.id, sector.locations.length),
            planetType,
            isEmpty: false,
            dominantRace: getDominantRaceForPlanet(planetType),
            population: 100 + Math.floor(Math.random() * 900),
            contracts: [],
        });
    }
};

/**
 * Обеспечивает наличие хотя бы одной станции
 * Доминирующая раса на станции выбирается на основе рас планет в секторе
 */
export const ensureStation = (
    sector: Sector,
    minimumCount = MIN_REQUIREMENTS.stations,
): void => {
    if (shouldSkipSectorEnsure(sector, "station")) return;

    const stationCount = sector.locations.filter(
        (l) => l.type === "station",
    ).length;

    if (stationCount >= minimumCount) return;

    const stationType =
        STATION_TYPES[Math.floor(Math.random() * STATION_TYPES.length)];

    // Выбираем доминирующую расу для станции на основе рас планет в секторе
    const planets = sector.locations.filter(
        (l) => l.type === "planet" && !l.isEmpty && l.dominantRace,
    );

    let stationRace;
    if (planets.length > 0) {
        // Берём случайную планету и используем её расу
        const randomPlanet =
            planets[Math.floor(Math.random() * planets.length)];
        stationRace = randomPlanet.dominantRace;
    } else {
        // Если нет планет, выбираем случайную расу
        stationRace = getRandomRace([]);
    }

    sector.locations.push({
        id: `${sector.id}-extra-station${stationCount ? `-${stationCount}` : ""}`,
        stationId: `station-${sector.id}-extra${stationCount ? `-${stationCount}` : ""}`,
        type: "station",
        name: getLocationNameKey("station", sector.id, sector.locations.length),
        stationType,
        stationConfig: STATION_CONFIG[stationType],
        dominantRace: stationRace,
        population: 50 + Math.floor(Math.random() * 200),
    });
};

export const ensureStationAnchors = (
    sectors: Sector[],
    anchors: Partial<Record<GalaxyTierAll, number>>,
): void => {
    for (const [tierText, required] of Object.entries(anchors)) {
        const tier = Number(tierText) as GalaxyTierAll;
        const eligible = sectors.filter(
            (sector) =>
                sector.tier === tier &&
                sector.star.type !== "blackhole" &&
                !shouldSkipSectorEnsure(sector, "station"),
        );
        if (!eligible.length) continue;
        while (
            eligible.flatMap((sector) => sector.locations).filter(
                (location) => location.type === "station",
            ).length < required
        ) {
            const target = eligible.reduce((leastStations, sector) =>
                sector.locations.filter((location) => location.type === "station").length <
                leastStations.locations.filter((location) => location.type === "station").length
                    ? sector
                    : leastStations,
            );
            const stationCount = target.locations.filter(
                (location) => location.type === "station",
            ).length;
            ensureStation(target, stationCount + 1);
        }
    }
};

/**
 * Обеспечивает наличие хотя бы одной верфи и одной медицинской станции
 * в секторах заданного тира
 */
export const ensureStationTypes = (
    sectors: Sector[],
    tier: GalaxyTierAll,
): void => {
    const tierSectors = sectors.filter(
        (sector) =>
            sector.tier === tier &&
            sector.star?.type !== "blackhole" &&
            !shouldSkipSectorEnsure(sector, "station"),
    );

    const requiredTypes: Array<"shipyard" | "medical" | "military"> = [
        "shipyard",
        "medical",
        ...(tier === 1 ? ["military" as const] : []),
    ];
    const stationTypes = tierSectors
        .flatMap((sector) => sector.locations)
        .filter((location) => location.type === "station")
        .map((location) => location.stationType);

    for (const requiredType of requiredTypes) {
        const hasType = tierSectors.some((s) =>
            s.locations.some(
                (l) => l.type === "station" && l.stationType === requiredType,
            ),
        );

        if (hasType) continue;

        // Find a sector with a station that isn't already a service station.
        for (const sector of tierSectors) {
            let stationIdx = sector.locations.findIndex(
                (l) =>
                    l.type === "station" &&
                    l.stationType !== "shipyard" &&
                    l.stationType !== "medical",
            );

            if (stationIdx < 0) {
                stationIdx = sector.locations.findIndex(
                    (l) =>
                        l.type === "station" &&
                        l.stationType !== requiredType &&
                        stationTypes.filter((type) => type === l.stationType).length > 1,
                );
            }

            if (
                stationIdx < 0 &&
                tier !== 1 &&
                !tierSectors.some((candidate) =>
                    candidate.locations.some(
                        (location) =>
                            location.type === "station" &&
                            location.stationType !== "shipyard" &&
                            location.stationType !== "medical",
                    ),
                )
            ) {
                stationIdx = sector.locations.findIndex(
                    (l) => l.type === "station" && l.stationType !== requiredType,
                );
            }

            if (stationIdx >= 0) {
                const existing = sector.locations[stationIdx];
                sector.locations[stationIdx] = {
                    ...existing,
                    stationType: requiredType,
                    stationConfig: STATION_CONFIG[requiredType],
                };
                break;
            }
        }
    }
};

/**
 * Обеспечивает наличие ровно одной дипломатической станции в tier-1 секторах.
 * Станция уникальна в галактике и всегда нейтральной расы.
 */
export const ensureDiplomaticStation = (sectors: Sector[]): void => {
    const hasDiplomatic = sectors.some((s) =>
        s.locations.some(
            (l) => l.type === "station" && l.stationType === "diplomatic",
        ),
    );
    if (hasDiplomatic) return;

    // Find a tier-1 sector with an existing station to replace
    const tier1Sectors = sectors.filter(
        (sector) =>
            sector.tier === 1 &&
            sector.star?.type !== "blackhole" &&
            !shouldSkipSectorEnsure(sector, "station"),
    );

    for (const sector of tier1Sectors) {
        const stationIdx = sector.locations.findIndex(
            (l) =>
                l.type === "station" &&
                l.stationType !== "shipyard" &&
                l.stationType !== "medical" &&
                l.stationType !== "military",
        );

        if (stationIdx >= 0) {
            const existing = sector.locations[stationIdx];
            sector.locations[stationIdx] = {
                ...existing,
                stationType: "diplomatic",
                stationConfig: STATION_CONFIG["diplomatic"],
                dominantRace: getRandomRace([]),
            };
            return;
        }
    }

    const serviceTypes = tier1Sectors
        .flatMap((sector) => sector.locations)
        .filter((location) => location.type === "station")
        .map((location) => location.stationType);
    for (const sector of tier1Sectors) {
        const stationIdx = sector.locations.findIndex(
            (location) =>
                location.type === "station" &&
                (location.stationType === "shipyard" || location.stationType === "medical") &&
                serviceTypes.filter((type) => type === location.stationType).length > 1,
        );
        if (stationIdx >= 0) {
            const existing = sector.locations[stationIdx];
            sector.locations[stationIdx] = {
                ...existing,
                stationType: "diplomatic",
                stationConfig: STATION_CONFIG.diplomatic,
                dominantRace: getRandomRace([]),
            };
            return;
        }
    }

    // Fallback: add a new diplomatic station to first tier-1 sector
    if (tier1Sectors.length > 0) {
        const sector = tier1Sectors[0];
        sector.locations.push({
            id: `${sector.id}-diplomatic`,
            stationId: `station-${sector.id}-diplomatic`,
            type: "station",
            name: getLocationNameKey("station", sector.id, sector.locations.length),
            stationType: "diplomatic",
            stationConfig: STATION_CONFIG["diplomatic"],
            dominantRace: getRandomRace([]),
        });
    }
};

/**
 * Обеспечивает наличие минимального количества чёрных дыр
 * Ищет сектора без чёрных дыр, предпочитая tier 3
 * Гарантирует максимум 1 чёрная дыра на сектор
 */
export const ensureBlackHoles = (sectors: Sector[]): void => {
    const blackHoles = sectors.filter((s) => s.star?.type === "blackhole");
    const missing = MIN_REQUIREMENTS.blackHoles - blackHoles.length;

    if (missing <= 0) return;

    // Сначала пробуем tier 3 сектора без чёрных дыр
    const tier3Sectors = sectors.filter(
        (s) => s.tier === 3 && s.star?.type !== "blackhole",
    );

    for (let i = 0; i < Math.min(missing, tier3Sectors.length); i++) {
        tier3Sectors[i].star = {
            type: "blackhole",
            name: "star_types.blackhole",
        };
        tier3Sectors[i].locations = tier3Sectors[i].locations.slice(
            0,
            Math.min(5, tier3Sectors[i].locations.length),
        );
    }
};
