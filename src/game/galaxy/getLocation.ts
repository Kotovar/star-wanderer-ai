import type { GalaxyTier, LocationType, Location } from "../types";
import { LOCATION_CHANCES, LOCATION_TYPE_CHANCES } from "./config";
import {
    generateAnomaly,
    generateAsteroidBelt,
    generateBossOrAnomaly,
    generateDistressSignal,
    generateEnemyShip,
    generateFriendlyShip,
    generatePlanet,
    generateStation,
    generateStorm,
} from "./generate";

/**
 * Выбирает тип локации на основе вероятностей
 */
const getLocationType = (
    roll: number,
    tier: GalaxyTier,
    isBlackHole: boolean,
): LocationType => {
    if (isBlackHole) {
        return "anomaly";
    }

    const chances = LOCATION_CHANCES[`tier${tier}`];
    const { planet, asteroidBelt, distressSignal } = LOCATION_TYPE_CHANCES;

    const thresholds = {
        station: chances.station,
        friendlyShip: chances.station + chances.friendlyShip,
        planet: chances.station + chances.friendlyShip + planet,
        enemy:
            chances.station + chances.friendlyShip + planet + chances.enemyShip,
        asteroidBelt:
            chances.station +
            chances.friendlyShip +
            planet +
            chances.enemyShip +
            asteroidBelt,
        storm:
            chances.station +
            chances.friendlyShip +
            planet +
            chances.enemyShip +
            asteroidBelt +
            chances.storm,
        distressSignal:
            chances.station +
            chances.friendlyShip +
            planet +
            chances.enemyShip +
            asteroidBelt +
            chances.storm +
            distressSignal,
        boss:
            chances.station +
            chances.friendlyShip +
            planet +
            chances.enemyShip +
            asteroidBelt +
            chances.storm +
            distressSignal +
            chances.boss,
    };

    if (roll < thresholds.station) return "station";
    if (roll < thresholds.friendlyShip) return "friendly_ship";
    if (roll < thresholds.planet) return "planet";
    if (roll < thresholds.enemy) return "enemy";
    if (roll < thresholds.asteroidBelt) return "asteroid_belt";
    if (roll < thresholds.storm) return "storm";
    if (roll < thresholds.distressSignal) return "distress_signal";
    if (roll < thresholds.boss) return "boss";
    return "anomaly";
};

/**
 * Генерирует локацию для сектора
 */
export const generateLocation = (
    sectorIdx: number,
    locIdx: number,
    tier: GalaxyTier,
    baseDanger: number,
    isBlackHole: boolean,
): Location => {
    const locType = Math.random();
    const type = getLocationType(locType, tier, isBlackHole);

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
        case "boss":
            return generateBossOrAnomaly(sectorIdx, locIdx, tier, isBlackHole);
        case "anomaly":
        default:
            return generateAnomaly(sectorIdx, locIdx, tier, isBlackHole);
    }
};
