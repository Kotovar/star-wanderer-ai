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
 * - Tier 1: Красные карлики (40%), Жёлтые карлики (35%), Белые карлики (10%), Двойные (10%), Чёрные дыры (5%)
 * - Tier 2: Красные карлики (35%), Жёлтые карлики (25%), Голубые гиганты (10%), Нейтронные (10%),
 *           Красные сверхгиганты (5%), Тройные (5%), Чёрные дыры (10%)
 * - Tier 3: Красные карлики (25%), Жёлтые карлики (15%), Голубые гиганты (15%), Нейтронные (15%),
 *           Красные сверхгиганты (10%), Тройные (5%), Чёрные дыры (15%)
 */
export const generateStar = (tier: GalaxyTier): Sector["star"] => {
    const starRoll = Math.random();

    // Шансы для чёрных дыр
    const blackHoleChance = STAR_CHANCES[`blackHoleTier${tier}`];

    // Шансы для кратных звёздных систем
    const tripleStarChance = tier >= 2 ? STAR_CHANCES.tripleStarTier2 : 0;
    const doubleStarChance =
        STAR_CHANCES.doubleStarBase + tier * STAR_CHANCES.doubleStarTierBonus;

    // Проверка на чёрную дыру
    if (starRoll < blackHoleChance) {
        return { type: "blackhole", name: "Чёрная дыра" };
    }

    // Проверка на тройную систему
    if (tier >= 2 && starRoll < tripleStarChance) {
        return { type: "triple", name: "Тройная звезда" };
    }

    // Проверка на двойную систему
    if (starRoll < doubleStarChance) {
        return { type: "double", name: "Двойная звезда" };
    }

    // Распределение одиночных звёзд по типам
    const remainingRoll = starRoll - doubleStarChance;
    const remainingRange =
        1 - doubleStarChance - blackHoleChance - tripleStarChance;
    const normalizedRoll = remainingRoll / remainingRange;

    if (tier === 1) {
        // Tier 1: больше красных и жёлтых карликов
        if (normalizedRoll < 0.45) {
            return { type: "red_dwarf", name: "Красный карлик" };
        }
        if (normalizedRoll < 0.85) {
            return { type: "yellow_dwarf", name: "Жёлтый карлик" };
        }
        if (normalizedRoll < 0.95) {
            return { type: "white_dwarf", name: "Белый карлик" };
        }
        return { type: "yellow_dwarf", name: "Жёлтый карлик" };
    }

    if (tier === 2) {
        // Tier 2: разнообразие с появлением гигантов
        if (normalizedRoll < 0.35) {
            return { type: "red_dwarf", name: "Красный карлик" };
        }
        if (normalizedRoll < 0.6) {
            return { type: "yellow_dwarf", name: "Жёлтый карлик" };
        }
        if (normalizedRoll < 0.75) {
            return { type: "white_dwarf", name: "Белый карлик" };
        }
        if (normalizedRoll < 0.85) {
            return { type: "blue_giant", name: "Голубой гигант" };
        }
        if (normalizedRoll < 0.92) {
            return { type: "neutron_star", name: "Нейтронная звезда" };
        }
        return { type: "red_supergiant", name: "Красный сверхгигант" };
    }

    // Tier 3+: больше редких звёзд
    if (normalizedRoll < 0.25) {
        return { type: "red_dwarf", name: "Красный карлик" };
    }
    if (normalizedRoll < 0.45) {
        return { type: "yellow_dwarf", name: "Жёлтый карлик" };
    }
    if (normalizedRoll < 0.55) {
        return { type: "white_dwarf", name: "Белый карлик" };
    }
    if (normalizedRoll < 0.7) {
        return { type: "blue_giant", name: "Голубой гигант" };
    }
    if (normalizedRoll < 0.85) {
        return { type: "neutron_star", name: "Нейтронная звезда" };
    }
    if (normalizedRoll < 0.95) {
        return { type: "red_supergiant", name: "Красный сверхгигант" };
    }
    return { type: "blue_giant", name: "Голубой гигант" };
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
        name: `Станция ${String.fromCharCode(65 + (locIdx % 26))}`,
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
                ? "★ Древний астероидный пояс"
                : `Пояс астероидов`,
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
        type: "boss",
        name: eternalBoss.name,
        bossId: eternalBoss.id,
        bossDefeated: false,
    });
};
