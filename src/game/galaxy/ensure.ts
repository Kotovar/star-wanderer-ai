import { getRandomRace, PLANET_TYPES } from "../constants";
import { GalaxyTier, Sector } from "../types";
import { ANOMALY_COLORS, MIN_REQUIREMENTS } from "./config";
import { STATION_TYPES } from "./consts";

/**
 * Обеспечивает минимальное количество аномалий в секторе
 */
export const ensureMinAnomalies = (sector: Sector, tier: GalaxyTier): void => {
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
        sector.locations[emptyPlanetIdx] = {
            ...planet,
            isEmpty: false,
            dominantRace: getRandomRace([]),
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
            dominantRace: getRandomRace([]),
            population: 100 + Math.floor(Math.random() * 900),
            contracts: [],
        });
    }
};

/**
 * Обеспечивает наличие хотя бы одной станции
 */
export const ensureStation = (sector: Sector): void => {
    const stationCount = sector.locations.filter(
        (l) => l.type === "station",
    ).length;

    if (stationCount >= MIN_REQUIREMENTS.stations) return;

    sector.locations.push({
        id: `${sector.id}-extra-station`,
        stationId: `station-${sector.id}-extra`,
        type: "station",
        name: `Станция ${String.fromCharCode(65 + (sector.locations.length % 26))}`,
        stationType:
            STATION_TYPES[Math.floor(Math.random() * STATION_TYPES.length)],
        dominantRace: getRandomRace([]),
        population: 50 + Math.floor(Math.random() * 200),
    });
};

/**
 * Обеспечивает наличие минимального количества чёрных дыр
 */
export const ensureBlackHoles = (sectors: Sector[]): void => {
    const blackHoles = sectors.filter((s) => s.star?.type === "blackhole");
    const missing = MIN_REQUIREMENTS.blackHoles - blackHoles.length;

    if (missing <= 0) return;

    const tier3Sectors = sectors.filter(
        (s) => s.tier === 3 && s.star?.type !== "blackhole",
    );

    for (let i = 0; i < Math.min(missing, tier3Sectors.length); i++) {
        tier3Sectors[i].star = { type: "blackhole", name: "Чёрная дыра" };
        tier3Sectors[i].locations = tier3Sectors[i].locations.slice(
            0,
            Math.min(5, tier3Sectors[i].locations.length),
        );
    }
};
