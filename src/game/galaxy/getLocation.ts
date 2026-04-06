import type { GalaxyTierAll, LocationType, Location, StarType } from "@/game/types";
import {
    LOCATION_CHANCES,
    LOCATION_TYPE_CHANCES_BY_TIER,
    BLACK_HOLE_LOCATION_CHANCES,
    STAR_TYPE_LOCATION_MODIFIERS,
} from "./config";
import {
    generateAnomaly,
    generateAsteroidBelt,
    generateBossOrAnomaly,
    generateDerelictShip,
    generateDistressSignal,
    generateEnemyShip,
    generateFriendlyShip,
    generateGasGiant,
    generatePlanet,
    generateStation,
    generateStorm,
    generateWreckField,
} from "./generate";

/**
 * Выбирает тип локации на основе вероятностей.
 * Веса нормализуются до суммы 1.0, остаток уходит в "anomaly".
 * Тип звезды применяет мультипликаторы к базовым весам.
 */
const getLocationType = (
    roll: number,
    tier: GalaxyTierAll,
    isBlackHole: boolean,
    starType?: StarType,
): LocationType => {
    if (isBlackHole) {
        // ЧД: шторма, аномалии, враги, руины — но не планеты/станции/мирные корабли.
        // Боссы добавляются отдельно в постобработке generateGalaxy.
        const bh = BLACK_HOLE_LOCATION_CHANCES;
        let c = 0;
        if (roll < (c += bh.anomaly)) return "anomaly";
        if (roll < (c += bh.enemy)) return "enemy";
        if (roll < (c += bh.storm)) return "storm";
        if (roll < (c += bh.derelictShip)) return "derelict_ship";
        if (roll < (c += bh.distressSignal)) return "distress_signal";
        if (roll < (c += bh.wreckField)) return "wreck_field";
        return "anomaly"; // запас
    }

    const chances = LOCATION_CHANCES[`tier${tier}`];
    const { planet, asteroidBelt, distressSignal, derelictShip, gasGiant, wreckField } =
        LOCATION_TYPE_CHANCES_BY_TIER[tier];
    const mods = starType ? (STAR_TYPE_LOCATION_MODIFIERS[starType] ?? {}) : {};
    const m = (base: number, key: keyof typeof mods): number =>
        base * (mods[key] ?? 1);

    // Базовые веса с применением модификаторов звезды
    const w = {
        station: m(chances.station, "station"),
        friendlyShip: m(chances.friendlyShip, "friendlyShip"),
        planet: m(planet, "planet"),
        enemy: m(chances.enemyShip, "enemy"),
        asteroidBelt: m(asteroidBelt, "asteroidBelt"),
        storm: m(chances.storm, "storm"),
        distressSignal: m(distressSignal, "distressSignal"),
        derelictShip: m(derelictShip, "derelictShip"),
        // Газовый гигант как локация не спавнится в системе газового гиганта-звезды
        gasGiant: starType === "gas_giant" ? 0 : m(gasGiant, "gasGiant"),
        boss: m(chances.boss, "boss"),
        // Аномалия: явный базовый вес 6%, усиливается модификатором звезды
        anomaly: 0.06 * (mods.anomaly ?? 1),
        wreckField: m(wreckField, "wreckField"),
    };

    // Нормализация: сумма весов → 1.0
    const total = Object.values(w).reduce((a, b) => a + b, 0);
    const n = 1 / total;

    let c = 0;
    if (roll < (c += w.station * n)) return "station";
    if (roll < (c += w.friendlyShip * n)) return "friendly_ship";
    if (roll < (c += w.planet * n)) return "planet";
    if (roll < (c += w.enemy * n)) return "enemy";
    if (roll < (c += w.asteroidBelt * n)) return "asteroid_belt";
    if (roll < (c += w.storm * n)) return "storm";
    if (roll < (c += w.distressSignal * n)) return "distress_signal";
    if (roll < (c += w.derelictShip * n)) return "derelict_ship";
    if (roll < (c += w.gasGiant * n)) return "gas_giant";
    if (roll < (c += w.boss * n)) return "boss";
    if (roll < (c += w.wreckField * n)) return "wreck_field";
    return "anomaly";
};

/**
 * Генерирует локацию для сектора
 */
export const generateLocation = (
    sectorIdx: number,
    locIdx: number,
    tier: GalaxyTierAll,
    baseDanger: number,
    isBlackHole: boolean,
    starType?: StarType,
): Location => {
    const locType = Math.random();
    const type = getLocationType(locType, tier, isBlackHole, starType);

    switch (type) {
        case "station":
            return generateStation(sectorIdx, locIdx);
        case "friendly_ship":
            return generateFriendlyShip(sectorIdx, locIdx);
        case "planet":
            return generatePlanet(sectorIdx, locIdx, tier, isBlackHole);
        case "enemy":
            return generateEnemyShip(
                sectorIdx,
                locIdx,
                baseDanger,
                isBlackHole,
            );
        case "asteroid_belt":
            return generateAsteroidBelt(sectorIdx, locIdx, tier);
        case "storm":
            return generateStorm(sectorIdx, locIdx, tier);
        case "distress_signal":
            return generateDistressSignal(sectorIdx, locIdx);
        case "derelict_ship":
            return generateDerelictShip(sectorIdx, locIdx);
        case "gas_giant":
            return generateGasGiant(sectorIdx, locIdx);
        case "wreck_field":
            return generateWreckField(sectorIdx, locIdx, tier);
        case "boss":
            return generateBossOrAnomaly(sectorIdx, locIdx, tier, isBlackHole);
        case "anomaly":
        default:
            return generateAnomaly(sectorIdx, locIdx, tier, isBlackHole);
    }
};
