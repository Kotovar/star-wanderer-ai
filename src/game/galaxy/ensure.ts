import { PLANET_TYPES } from "@/game/constants/planets";
import type { GalaxyTierAll, Sector } from "@/game/types";
import { bossDistribution } from "./bossDistribution";
import { ANOMALY_COLORS, MIN_REQUIREMENTS, STATION_CONFIG } from "./config";
import { STATION_TYPES } from "./consts";
import { getRandomRace, getDominantRaceForPlanet } from "@/game/races/utils";

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
 * Обеспечивает наличие гарантированных боссов по тирам
 * - Тир 1: 1 случайный босс 1 тира
 * - Тир 2: 1 случайный босс 2 тира
 * - Тир 3: 1 Оракул Пустоты (только в одном секторе)
 */
export const ensureBoss = (sector: Sector): void => {
    // Tier 3: guarantee exactly ONE Void Oracle across all tier 3 sectors
    if (sector.tier === 3) {
        const bossCount = sector.locations.filter(
            (l) => l.type === "boss",
        ).length;

        // If no boss in this sector and Void Oracle not yet placed
        if (bossCount === 0 && !bossDistribution.isGuaranteedBossPlaced(3)) {
            bossDistribution.markBossAsUsed("void_oracle");
            bossDistribution.markGuaranteedBossPlaced(3);
            sector.locations.push({
                id: `${sector.id}-guaranteed-boss`,
                type: "boss",
                name: "👁️ Оракул Пустоты",
                bossId: "void_oracle",
                bossDefeated: false,
            });
        }
        return;
    }

    // Tier 1 and 2: guarantee exactly one boss per tier
    if (sector.tier === 1 || sector.tier === 2) {
        const tierNum = sector.tier;
        const bossCount = sector.locations.filter(
            (l) => l.type === "boss",
        ).length;

        // If no boss in this sector and guaranteed boss not yet placed for this tier
        if (
            bossCount === 0 &&
            !bossDistribution.isGuaranteedBossPlaced(tierNum)
        ) {
            const guaranteedBoss =
                bossDistribution.getGuaranteedBossForTier(tierNum);
            if (guaranteedBoss) {
                bossDistribution.markBossAsUsed(guaranteedBoss.id);
                bossDistribution.markGuaranteedBossPlaced(tierNum);
                sector.locations.push({
                    id: `${sector.id}-guaranteed-boss`,
                    type: "boss",
                    name: guaranteedBoss.name,
                    bossId: guaranteedBoss.id,
                    bossType: guaranteedBoss.bossType,
                    bossDefeated: false,
                });
            }
        }
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
            name: `${String.fromCharCode(67 + (sector.locations.length % 26))}-${planetType.substring(0, 3)}`,
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
export const ensureStation = (sector: Sector): void => {
    const stationCount = sector.locations.filter(
        (l) => l.type === "station",
    ).length;

    if (stationCount >= MIN_REQUIREMENTS.stations) return;

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
        id: `${sector.id}-extra-station`,
        stationId: `station-${sector.id}-extra`,
        type: "station",
        name: `Станция ${String.fromCharCode(65 + (sector.locations.length % 26))}`,
        stationType,
        stationConfig: STATION_CONFIG[stationType],
        dominantRace: stationRace,
        population: 50 + Math.floor(Math.random() * 200),
    });
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
        (s) => s.tier === tier && s.star?.type !== "blackhole",
    );

    const requiredTypes: Array<"shipyard" | "medical"> = ["shipyard", "medical"];

    for (const requiredType of requiredTypes) {
        const hasType = tierSectors.some((s) =>
            s.locations.some(
                (l) => l.type === "station" && l.stationType === requiredType,
            ),
        );

        if (hasType) continue;

        // Find a sector with a station that isn't already the required type
        for (const sector of tierSectors) {
            const stationIdx = sector.locations.findIndex(
                (l) =>
                    l.type === "station" &&
                    l.stationType !== "shipyard" &&
                    l.stationType !== "medical",
            );

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
