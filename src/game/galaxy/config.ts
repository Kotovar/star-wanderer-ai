import type { GalaxyTierAll, StationConfig, StormType, StarType } from "../types";

// ============================================================================
// Константы конфигурации галактики
// ============================================================================

/** Конфигурация уровней галактики */
export const TIER_CONFIG: Array<{
    tier: GalaxyTierAll;
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

/**
 * Вероятности типов локаций по тирам.
 * Tier 1: много планет и освоенного пространства, мало руин.
 * Tier 2: базовый баланс.
 * Tier 3: опасный фронтир — больше поясов и руин, меньше планет.
 * Tier 4: древние глубины — развалины, обломки, почти нет колоний.
 */
export const LOCATION_TYPE_CHANCES_BY_TIER: Record<
    GalaxyTierAll,
    { planet: number; asteroidBelt: number; distressSignal: number; derelictShip: number; gasGiant: number }
> = {
    1: { planet: 0.42, asteroidBelt: 0.07, distressSignal: 0.04, derelictShip: 0.03, gasGiant: 0.04 },
    2: { planet: 0.35, asteroidBelt: 0.10, distressSignal: 0.07, derelictShip: 0.05, gasGiant: 0.05 },
    3: { planet: 0.28, asteroidBelt: 0.13, distressSignal: 0.09, derelictShip: 0.08, gasGiant: 0.06 },
    4: { planet: 0.20, asteroidBelt: 0.15, distressSignal: 0.10, derelictShip: 0.12, gasGiant: 0.08 },
};

/**
 * Распределение локаций в секторах с чёрной дырой (тир не влияет — всё одинаково опасно).
 * Нет: планет, станций, мирных кораблей, поясов астероидов, газовых гигантов.
 * Боссы добавляются отдельно в постобработке generateGalaxy.
 */
export const BLACK_HOLE_LOCATION_CHANCES = {
    anomaly: 0.40,       // аномальная физика рядом с сингулярностью
    enemy: 0.22,         // пираты используют ЧД как убежище
    storm: 0.20,         // гравитационные и радиационные шторма
    derelictShip: 0.12,  // корабли, не переживших притяжение
    distressSignal: 0.06,// кто-то всё ещё застрял
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
    tripleStarTier1: 0.05, // 5% для tier 1
    tripleStarTier2: 0.1, // 10% для tier 2
    tripleStarTier3: 0.15, // 15% для tier 3
    tripleStarTier4: 0.2, // 20% для tier 4
    doubleStarBase: 0.15, // 15% базовый шанс
    doubleStarTierBonus: 0.05, // +5% за тир
    variableStarTier1: 0.08, // 8% для tier 1
    variableStarTier2: 0.12, // 12% для tier 2
    variableStarTier3: 0.15, // 15% для tier 3
    variableStarTier4: 0.18, // 18% для tier 4
    stellarRemnantTier1: 0.03, // 3% для tier 1
    stellarRemnantTier2: 0.06, // 6% для tier 2
    stellarRemnantTier3: 0.1, // 10% для tier 3
    stellarRemnantTier4: 0.15, // 15% для tier 4
    gasGiantTier1: 0.05, // 5% для tier 1
    gasGiantTier2: 0.08, // 8% для tier 2
    gasGiantTier3: 0.1, // 10% для tier 3
    gasGiantTier4: 0.05, // 5% для tier 4
};

/** Конфигурация типов станций */
export const STATION_CONFIG: Record<string, StationConfig> = {
    trade: {
        cargoBonus: 1.5,
        priceDiscount: 0.85,
        mineralDiscount: 0.9,
        guaranteedWeapons: ["missile"],
        guaranteedModules: ["cargo", "reactor", "fueltank"],
        allowsTrade: true,
        allowsCraft: false,
        allowsModuleInstall: false,
        allowsCrewHeal: false,
    },
    military: {
        priceDiscount: 0.9,
        guaranteedWeapons: ["kinetic", "laser", "missile"],
        guaranteedModules: ["weaponbay", "shield", "reactor"],
        allowsTrade: false,
        allowsCraft: true,
        allowsModuleInstall: false,
        allowsCrewHeal: false,
    },
    research: {
        priceDiscount: 0.9,
        guaranteedProfessions: ["scientist"],
        guaranteedWeapons: ["laser"],
        guaranteedModules: ["scanner", "reactor", "lifesupport", "lab"],
        allowsTrade: false,
        allowsCraft: false,
        allowsModuleInstall: false,
        allowsCrewHeal: false,
    },
    mining: {
        mineralDiscount: 0.5,
        rareMineralDiscount: 0.5,
        guaranteedProfessions: ["engineer"],
        guaranteedWeapons: ["kinetic"],
        guaranteedModules: ["drill", "cargo", "fueltank"],
        allowsTrade: false,
        allowsCraft: false,
        allowsModuleInstall: false,
        allowsCrewHeal: false,
    },
    shipyard: {
        priceDiscount: 0.9,
        guaranteedProfessions: ["engineer"],
        guaranteedWeapons: [],
        guaranteedModules: ["reactor", "shield", "cargo"],
        allowsTrade: false,
        allowsCraft: true,
        allowsModuleInstall: true,
        allowsCrewHeal: false,
    },
    medical: {
        guaranteedProfessions: ["medic"],
        guaranteedWeapons: [],
        guaranteedModules: ["lifesupport", "medical"],
        allowsTrade: false,
        allowsCraft: false,
        allowsModuleInstall: false,
        allowsCrewHeal: true,
    },
};

/**
 * Модификаторы весов локаций для каждого типа звезды.
 * Значение = множитель базового шанса (2.0 = вдвое чаще, 0.3 = втрое реже).
 * Ключи соответствуют полям в объекте весов в getLocation.ts.
 */
type LocationWeightKey =
    | "station" | "friendlyShip" | "planet" | "enemy"
    | "asteroidBelt" | "storm" | "distressSignal" | "derelictShip"
    | "gasGiant" | "boss" | "anomaly";

export const STAR_TYPE_LOCATION_MODIFIERS: Partial<
    Record<StarType, Partial<Record<LocationWeightKey, number>>>
> = {
    // Красный карлик: тесная обитаемая зона, много мелких тел, старые системы
    red_dwarf: {
        planet: 1.5,
        asteroidBelt: 1.4,
        station: 0.9,
        gasGiant: 0.6,
    },
    // Жёлтый карлик: стабильная система, много жизни и торговли
    yellow_dwarf: {
        planet: 1.3,
        station: 1.4,
        friendlyShip: 1.4,
    },
    // Белый карлик: мёртвая звезда — руины, обломки, странные явления
    white_dwarf: {
        derelictShip: 2.5,
        asteroidBelt: 1.8,
        anomaly: 2.0,
        planet: 0.3,
        station: 0.4,
        friendlyShip: 0.3,
        gasGiant: 0.5,
    },
    // Голубой гигант: горячий, энергичный, опасный — шторма и пираты
    blue_giant: {
        storm: 2.5,
        enemy: 1.5,
        asteroidBelt: 1.3,
        planet: 0.5,
        station: 0.6,
        friendlyShip: 0.5,
    },
    // Красный сверхгигант: умирающая звезда — ветер, аномалии, запустение
    red_supergiant: {
        storm: 2.0,
        anomaly: 1.6,
        station: 0.4,
        friendlyShip: 0.4,
        planet: 0.6,
    },
    // Нейтронная звезда: пульсар — смертельная радиация, мощные аномалии
    neutron_star: {
        storm: 3.0,
        anomaly: 2.5,
        enemy: 1.4,
        planet: 0.2,
        station: 0.15,
        friendlyShip: 0.15,
        gasGiant: 0.3,
    },
    // Двойная система: гравитационный хаос — пояса астероидов и ресурсы
    double: {
        asteroidBelt: 1.8,
        gasGiant: 1.4,
        enemy: 1.2,
        planet: 0.8,
    },
    // Тройная система: крайняя нестабильность орбит
    triple: {
        asteroidBelt: 2.2,
        storm: 1.6,
        enemy: 1.4,
        station: 0.4,
        friendlyShip: 0.4,
        planet: 0.5,
    },
    // Газовый гигант (звезда): несостоявшаяся звезда, забытый угол галактики
    gas_giant: {
        derelictShip: 2.0,
        anomaly: 1.4,
        station: 0.5,
        friendlyShip: 0.3,
    },
    // Переменная звезда: непредсказуемые вспышки — шторма и сигналы бедствия
    variable_star: {
        storm: 2.5,
        anomaly: 1.8,
        distressSignal: 1.5,
        station: 0.5,
        friendlyShip: 0.5,
    },
    // Звёздный остаток: остывающие угли — руины, обломки, аномалии
    stellar_remnant: {
        derelictShip: 2.5,
        asteroidBelt: 1.8,
        anomaly: 2.0,
        planet: 0.3,
        station: 0.25,
        friendlyShip: 0.25,
        gasGiant: 0.4,
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
export const STORM_TYPES_LIST: StormType[] = [
    "radiation",
    "ionic",
    "plasma",
    "gravitational",
    "temporal",
    "nanite",
];

/** Названия штормов */
export const STORM_NAMES: Record<StormType, string> = {
    radiation: "Радиационное облако",
    ionic: "Ионный шторм",
    plasma: "Плазменный шторм",
    gravitational: "Гравитационный шторм",
    temporal: "Временной шторм",
    nanite: "Нанитный рой",
};
