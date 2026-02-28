import type { GalaxyTier, StationConfig, StormType } from "../types";

// ============================================================================
// Константы конфигурации галактики
// ============================================================================

/** Конфигурация уровней галактики */
export const TIER_CONFIG: Array<{
    tier: GalaxyTier;
    count: number;
    baseDanger: number;
    radiusRatio: number;
}> = [
    { tier: 1, count: 12, baseDanger: 1, radiusRatio: 0.25 },
    { tier: 2, count: 12, baseDanger: 3, radiusRatio: 0.5 },
    { tier: 3, count: 15, baseDanger: 5, radiusRatio: 0.75 },
    { tier: 4, count: 3, baseDanger: 8, radiusRatio: 1.0 },
];

/** Количество локаций по уровням */
export const LOCATION_COUNT = {
    tier1: { min: 6, max: 8 },
    tier2: { min: 8, max: 11 },
    tier3: { min: 8, max: 12 },
    tier4: { min: 5, max: 7 },
    blackHole: { min: 5, max: 7 },
};

/** Вероятности появления типов локаций по уровням */
export const LOCATION_CHANCES = {
    tier1: {
        station: 0.12,
        friendlyShip: 0.08,
        enemyShip: 0.15,
        storm: 0.05,
        boss: 0.02,
    },
    tier2: {
        station: 0.08,
        friendlyShip: 0.06,
        enemyShip: 0.25,
        storm: 0.1,
        boss: 0.04,
    },
    tier3: {
        station: 0.04,
        friendlyShip: 0.04,
        enemyShip: 0.32,
        storm: 0.13,
        boss: 0.06,
    },
    tier4: {
        station: 0.02,
        friendlyShip: 0.02,
        enemyShip: 0.4,
        storm: 0.15,
        boss: 0.1,
    },
};

/** Вероятности типов локаций (общие) */
export const LOCATION_TYPE_CHANCES = {
    planet: 0.35,
    asteroidBelt: 0.1,
    distressSignal: 0.07,
};

/** Вероятность пустой планеты по уровням */
export const EMPTY_PLANET_CHANCE = {
    tier1: 0.4,
    tier2: 0.6,
    tier3: 0.7,
    tier4: 0.1,
};

/** Шанс появления звезды по типам */
export const STAR_CHANCES = {
    blackHoleTier1: 0.01, // 1% для tier 1 (редко)
    blackHoleTier2: 0.1, // 10% для tier 2
    blackHoleTier3: 0.15, // 15% для tier 3
    blackHoleTier4: 0.01, // 1% для tier 4
    tripleStarTier2: 0.2,
    doubleStarBase: 0.3,
    doubleStarTierBonus: 0.1,
};

/** Конфигурация типов станций */
export const STATION_CONFIG: Record<string, StationConfig> = {
    Торговая: {
        cargoBonus: 1.5,
        priceDiscount: 0.85,
        mineralDiscount: 0.9,
        guaranteedWeapons: ["missile"],
        guaranteedModules: ["cargo", "reactor", "fueltank"],
    },
    Военная: {
        priceDiscount: 0.9,
        guaranteedWeapons: ["kinetic", "laser", "missile"],
        guaranteedModules: ["weaponbay", "shield", "reactor", "weaponbay"],
    },
    Исследовательская: {
        priceDiscount: 0.9,
        guaranteedProfessions: ["scientist"],
        guaranteedWeapons: ["laser"],
        guaranteedModules: ["scanner", "reactor", "lifesupport"],
    },
    Добывающая: {
        mineralDiscount: 0.5,
        rareMineralDiscount: 0.5,
        guaranteedWeapons: ["kinetic"],
        guaranteedModules: ["drill", "cargo", "fueltank"],
    },
};

/** Минимальное количество объектов для обеспечения */
export const MIN_REQUIREMENTS = {
    anomalies: 1,
    colonizedPlanets: 1,
    stations: 1,
    blackHoles: 2,
};

/** Цвета аномалий по уровням */
export const ANOMALY_COLORS: Record<number, string> = {
    1: "#00ff41",
    2: "#ffaa00",
    3: "#ff0040",
};

/** Типы штормов */
export const STORM_TYPES_LIST: StormType[] = ["radiation", "ionic", "plasma"];

/** Названия штормов */
export const STORM_NAMES: Record<StormType, string> = {
    radiation: "Радиационное облако",
    ionic: "Ионный шторм",
    plasma: "Плазменный шторм",
};
