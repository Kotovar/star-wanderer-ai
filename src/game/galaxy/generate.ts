import {
    ANCIENT_BOSSES,
    ENEMY_TYPES,
    getRandomBossForTier,
    getRandomRace,
    PLANET_TYPES,
    RACES,
} from "../constants";
import { GalaxyTier, Sector, Location, RaceId, AsteroidTier } from "../types";
import {
    ANOMALY_COLORS,
    EMPTY_PLANET_CHANCE,
    STAR_CHANCES,
    STORM_NAMES,
    STORM_TYPES_LIST,
} from "./config";
import { SHIP_TYPES, STATION_TYPES } from "./consts";

/**
 * Генерирует звезду для сектора на основе уровня и случайности
 */
export const generateStar = (tier: GalaxyTier): Sector["star"] => {
    const starRoll = Math.random();
    const blackHoleChance = tier === 3 ? STAR_CHANCES.blackHoleTier3 : 0;
    const tripleStarChance = tier === 2 ? STAR_CHANCES.tripleStarTier2 : 0;
    const doubleStarChance =
        STAR_CHANCES.doubleStarBase + tier * STAR_CHANCES.doubleStarTierBonus;

    if (tier === 3 && starRoll < blackHoleChance) {
        return { type: "blackhole", name: "Чёрная дыра" };
    }
    if (tier === 2 && starRoll < tripleStarChance) {
        return { type: "triple", name: "Тройная звезда" };
    }
    if (starRoll < doubleStarChance) {
        return { type: "double", name: "Двойная звезда" };
    }
    return { type: "single", name: "Одиночная звезда" };
};

/**
 * Генерирует базовую станцию
 */
export const generateStation = (
    sectorIdx: number,
    locIdx: number,
): Location => {
    const stationType =
        STATION_TYPES[Math.floor(Math.random() * STATION_TYPES.length)];
    const dominantRace = getRandomRace([]);

    return {
        id: `${sectorIdx}-${locIdx}`,
        stationId: `station-${sectorIdx}-${locIdx}`,
        type: "station",
        name: `Станция ${String.fromCharCode(65 + (locIdx % 26))}`,
        population: 50 + Math.floor(Math.random() * 200),
        stationType,
        dominantRace,
    };
};

/**
 * Генерирует дружественный корабль
 */
export const generateFriendlyShip = (
    sectorIdx: number,
    locIdx: number,
): Location => {
    const shipType = SHIP_TYPES[Math.floor(Math.random() * SHIP_TYPES.length)];
    const shipRace = getRandomRace([]);
    const raceInfo = RACES[shipRace];
    const shipName = `${raceInfo.adjective || raceInfo.name} ${shipType.name}`;

    return {
        id: `${sectorIdx}-${locIdx}`,
        type: "friendly_ship",
        name: shipName,
        greeting: shipType.greeting,
        hasTrader: shipType.hasTrader,
        hasCrew: shipType.hasCrew,
        hasQuest: shipType.hasQuest,
        dominantRace: shipRace,
        shipRace,
    };
};

/**
 * Генерирует планету
 */
export const generatePlanet = (
    sectorIdx: number,
    locIdx: number,
    tier: GalaxyTier,
    isBlackHole: boolean,
): Location => {
    const planetType =
        PLANET_TYPES[Math.floor(Math.random() * PLANET_TYPES.length)];
    const isEmpty = isBlackHole
        ? true
        : Math.random() < EMPTY_PLANET_CHANCE[`tier${tier}`];

    let dominantRace: RaceId = "human";
    let population: number | undefined;

    if (!isEmpty) {
        dominantRace = getRandomRace([]);
        population = 100 + Math.floor(Math.random() * 900);
    }

    return {
        id: `${sectorIdx}-${locIdx}`,
        type: "planet",
        name: `${String.fromCharCode(65 + (locIdx % 26))}-${planetType.substring(0, 3)}`,
        planetType,
        isEmpty,
        contracts: [],
        scoutingAvailable: isEmpty,
        dominantRace,
        population,
    };
};

/**
 * Генерирует вражеский корабль
 */
export const generateEnemyShip = (
    sectorIdx: number,
    locIdx: number,
    baseDanger: number,
    isBlackHole: boolean,
): Location => {
    const enemyType =
        ENEMY_TYPES[Math.floor(Math.random() * ENEMY_TYPES.length)];
    const threat = Math.min(
        3,
        Math.max(1, baseDanger - 1 + Math.floor(Math.random() * 3)),
    );

    return {
        id: `${sectorIdx}-${locIdx}`,
        type: "enemy",
        name: enemyType,
        enemyType,
        threat: isBlackHole ? Math.min(3, threat + 1) : threat,
    };
};

/**
 * Генерирует пояс астероидов
 */
export const generateAsteroidBelt = (
    sectorIdx: number,
    locIdx: number,
    tier: GalaxyTier,
): Location => {
    let asteroidTier: AsteroidTier = tier;
    const TIER4_CHANCE = 0.15;

    if (tier === 3 && Math.random() < TIER4_CHANCE) {
        asteroidTier = 4;
    }

    const resources = {
        minerals: (20 + Math.floor(Math.random() * 30)) * asteroidTier,
        rare: Math.floor(Math.random() * 5) * asteroidTier,
        credits: (50 + Math.floor(Math.random() * 100)) * asteroidTier,
    };

    return {
        id: `${sectorIdx}-${locIdx}`,
        type: "asteroid_belt",
        name:
            asteroidTier === 4
                ? "★ Древний астероидный пояс"
                : `Пояс астероидов ${asteroidTier}-го уровня`,
        mined: false,
        asteroidTier,
        resources,
    };
};

/**
 * Генерирует шторм
 */
export const generateStorm = (
    sectorIdx: number,
    locIdx: number,
    tier: GalaxyTier,
): Location => {
    const stormType =
        STORM_TYPES_LIST[Math.floor(Math.random() * STORM_TYPES_LIST.length)];

    return {
        id: `${sectorIdx}-${locIdx}`,
        type: "storm",
        name: STORM_NAMES[stormType],
        stormType,
        stormIntensity: tier,
    };
};

/**
 * Генерирует сигнал бедствия
 */
export const generateDistressSignal = (
    sectorIdx: number,
    locIdx: number,
): Location => ({
    id: `${sectorIdx}-${locIdx}`,
    type: "distress_signal",
    name: "Сигнал бедствия",
    signalResolved: false,
});

/**
 * Генерирует босса или аномалию
 */
export const generateBossOrAnomaly = (
    sectorIdx: number,
    locIdx: number,
    tier: GalaxyTier,
    isBlackHole: boolean,
): Location => {
    const boss = getRandomBossForTier(tier);

    if (boss) {
        return {
            id: `${sectorIdx}-${locIdx}`,
            type: "ancient_boss",
            name: boss.name,
            bossId: boss.id,
            bossDefeated: false,
        };
    }

    return generateAnomaly(sectorIdx, locIdx, tier, isBlackHole);
};

/**
 * Генерирует аномалию
 */
export const generateAnomaly = (
    sectorIdx: number,
    locIdx: number,
    tier: GalaxyTier,
    isBlackHole: boolean,
): Location => {
    let anomalyTier = tier;
    let anomalyColor = ANOMALY_COLORS[tier];

    if (tier === 2) {
        anomalyTier = Math.random() < 0.6 ? 1 : 2;
    } else if (tier === 3) {
        anomalyTier = Math.random() < 0.3 ? 2 : 3;
    }

    if (isBlackHole) {
        anomalyTier = Math.min(3, anomalyTier + 1) as GalaxyTier;
        anomalyColor = ANOMALY_COLORS[3];
    }

    return {
        id: `${sectorIdx}-${locIdx}`,
        type: "anomaly",
        name: "Аномалия",
        anomalyType: Math.random() < 0.5 ? "good" : "bad",
        anomalyTier,
        anomalyColor,
        requiresScientistLevel: anomalyTier,
    };
};

/**
 * Добавляет босса The Eternal в сектор с чёрной дырой
 */
export const addEternalBoss = (sector: Sector): void => {
    const eternalBoss = ANCIENT_BOSSES.find((b) => b.id === "the_eternal");
    if (!eternalBoss) return;

    sector.locations.push({
        id: `${sector.id}-boss-eternal`,
        type: "ancient_boss",
        name: eternalBoss.name,
        bossId: eternalBoss.id,
        bossDefeated: false,
    });
};
