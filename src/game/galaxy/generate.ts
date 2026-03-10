import { RACES } from "@/game/constants/races";
import {
    GalaxyTier,
    Sector,
    Location,
    RaceId,
    AsteroidTier,
} from "@/game/types";
import {
    ANOMALY_COLORS,
    EMPTY_PLANET_CHANCE,
    STAR_CHANCES,
    STORM_NAMES,
    STORM_TYPES_LIST,
    STATION_CONFIG,
} from "./config";
import { SHIP_TYPES, STATION_TYPES } from "./consts";
import { PLANET_TYPES } from "@/game/constants/planets";
import { getRandomRace, getDominantRaceForPlanet } from "@/game/races/utils";
import { getRandomBossForTier } from "@/game/bosses/utils";
import { ANCIENT_BOSSES } from "@/game/constants/bosses";

const ENEMY_TYPES = ["Пираты", "Рейдеры", "Наёмники", "Мародёры"];

/**
 * Генерирует звезду для сектора на основе уровня и случайности
 *
 * Распределение типов звёзд по уровням:
 * - Tier 1: Красные карлики (40%), Жёлтые карлики (35%), Белые карлики (10%), Двойные (10%), Чёрные дыры (5%), Газовые гиганты (5%)
 * - Tier 2: Красные карлики (35%), Жёлтые карлики (25%), Голубые гиганты (10%), Нейтронные (10%),
 *           Красные сверхгиганты (5%), Тройные (5%), Чёрные дыры (10%), Газовые гиганты (8%)
 * - Tier 3: Красные карлики (25%), Жёлтые карлики (15%), Голубые гиганты (15%), Нейтронные (15%),
 *           Красные сверхгиганты (10%), Тройные (5%), Чёрные дыры (15%), Газовые гиганты (10%)
 */
export const generateStar = (tier: GalaxyTier): Sector["star"] => {
    const starRoll = Math.random();

    // Шансы для чёрных дыр
    const blackHoleChance = STAR_CHANCES[`blackHoleTier${tier}`];

    // Шансы для кратных звёздных систем
    const tripleStarChance = tier >= 2 ? STAR_CHANCES.tripleStarTier2 : 0;
    const doubleStarChance =
        STAR_CHANCES.doubleStarBase + tier * STAR_CHANCES.doubleStarTierBonus;

    // Шансы для газовых гигантов (коричневых карликов)
    const gasGiantChance = STAR_CHANCES[`gasGiantTier${tier}`] ?? 0;

    // Накопительные пороги для последовательной проверки
    let cumulativeChance = 0;

    // Проверка на чёрную дыру
    cumulativeChance += blackHoleChance;
    if (starRoll < cumulativeChance) {
        return { type: "blackhole", name: "star_types.blackhole" };
    }

    // Проверка на тройную систему
    cumulativeChance += tripleStarChance;
    if (tier >= 2 && starRoll < cumulativeChance) {
        return { type: "triple", name: "star_types.triple" };
    }

    // Проверка на двойную систему
    cumulativeChance += doubleStarChance;
    if (starRoll < cumulativeChance) {
        return { type: "double", name: "star_types.double" };
    }

    // Проверка на газовый гигант (коричневый карлик)
    cumulativeChance += gasGiantChance;
    if (starRoll < cumulativeChance) {
        return { type: "gas_giant", name: "star_types.gas_giant" };
    }

    // Распределение одиночных звёзд по типам (нормализуем оставшийся диапазон)
    const remainingRoll = starRoll - cumulativeChance;
    const remainingRange = 1 - cumulativeChance;
    const normalizedRoll = remainingRoll / remainingRange;

    if (tier === 1) {
        // Tier 1: больше красных и жёлтых карликов
        if (normalizedRoll < 0.45) {
            return { type: "red_dwarf", name: "star_types.red_dwarf" };
        }
        if (normalizedRoll < 0.85) {
            return { type: "yellow_dwarf", name: "star_types.yellow_dwarf" };
        }
        if (normalizedRoll < 0.95) {
            return { type: "white_dwarf", name: "star_types.white_dwarf" };
        }
        return { type: "yellow_dwarf", name: "star_types.yellow_dwarf" };
    }

    if (tier === 2) {
        // Tier 2: разнообразие с появлением гигантов
        if (normalizedRoll < 0.35) {
            return { type: "red_dwarf", name: "star_types.red_dwarf" };
        }
        if (normalizedRoll < 0.6) {
            return { type: "yellow_dwarf", name: "star_types.yellow_dwarf" };
        }
        if (normalizedRoll < 0.75) {
            return { type: "white_dwarf", name: "star_types.white_dwarf" };
        }
        if (normalizedRoll < 0.85) {
            return { type: "blue_giant", name: "star_types.blue_giant" };
        }
        if (normalizedRoll < 0.92) {
            return { type: "neutron_star", name: "star_types.neutron_star" };
        }
        return { type: "red_supergiant", name: "star_types.red_supergiant" };
    }

    // Tier 3+: больше редких звёзд
    if (normalizedRoll < 0.25) {
        return { type: "red_dwarf", name: "star_types.red_dwarf" };
    }
    if (normalizedRoll < 0.45) {
        return { type: "yellow_dwarf", name: "star_types.yellow_dwarf" };
    }
    if (normalizedRoll < 0.55) {
        return { type: "white_dwarf", name: "star_types.white_dwarf" };
    }
    if (normalizedRoll < 0.7) {
        return { type: "blue_giant", name: "star_types.blue_giant" };
    }
    if (normalizedRoll < 0.85) {
        return { type: "neutron_star", name: "star_types.neutron_star" };
    }
    if (normalizedRoll < 0.95) {
        return { type: "red_supergiant", name: "star_types.red_supergiant" };
    }
    return { type: "blue_giant", name: "star_types.blue_giant" };
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
    const stationConfig = STATION_CONFIG[stationType];

    return {
        id: `${sectorIdx}-${locIdx}`,
        stationId: `station-${sectorIdx}-${locIdx}`,
        type: "station",
        name: `station_name.${String.fromCharCode(65 + (locIdx % 26))}`,
        stationType,
        stationConfig,
        dominantRace,
        population: 50 + Math.floor(Math.random() * 200),
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

    let dominantRace: RaceId | undefined = undefined;
    let population: number | undefined;

    if (!isEmpty) {
        dominantRace = getDominantRaceForPlanet(planetType);
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
                ? "asteroid_belt_names.ancient"
                : "asteroid_belt_names.regular",
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
    name: "location_types.distress_signal",
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
            type: "boss",
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
    let anomalyColor = ANOMALY_COLORS[tier] || ANOMALY_COLORS[3];

    if (tier === 2) {
        anomalyTier = Math.random() < 0.6 ? 1 : 2;
    } else if (tier === 3) {
        anomalyTier = Math.random() < 0.3 ? 2 : 3;
    } else if (tier === 4) {
        anomalyTier = 4;
        anomalyColor = "#ff00ff"; // Special color for tier 4
    }

    if (isBlackHole) {
        anomalyTier = Math.min(4, anomalyTier + 1) as GalaxyTier;
        anomalyColor = "#ff00ff";
    }

    return {
        id: `${sectorIdx}-${locIdx}`,
        type: "anomaly",
        name: "location_types.anomaly",
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
        type: "boss",
        name: eternalBoss.name,
        bossId: eternalBoss.id,
        bossDefeated: false,
    });
};
