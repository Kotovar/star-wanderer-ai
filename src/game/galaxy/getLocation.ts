import type { GalaxyTierAll, LocationType, Location, StarType } from "@/game/types";
import { LOCATION_CHANCES, LOCATION_TYPE_CHANCES } from "./config";
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
} from "./generate";

/**
 * Выбирает тип локации на основе вероятностей
 */
const getLocationType = (
    roll: number,
    tier: GalaxyTierAll,
    isBlackHole: boolean,
    starType?: StarType,
): LocationType => {
    if (isBlackHole) {
        // В ЧД-секторах: только аномалии и враги (станций/планет/кораблей нет)
        // Боссы добавляются гарантированно в пост-обработке generateGalaxy
        const bhRoll = Math.random();
        return bhRoll < 0.7 ? "anomaly" : "enemy";
    }

    const chances = LOCATION_CHANCES[`tier${tier}`];
    const { planet, asteroidBelt, distressSignal, derelictShip, gasGiant } = LOCATION_TYPE_CHANCES;

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
        derelictShip:
            chances.station +
            chances.friendlyShip +
            planet +
            chances.enemyShip +
            asteroidBelt +
            chances.storm +
            distressSignal +
            derelictShip,
        gasGiant:
            chances.station +
            chances.friendlyShip +
            planet +
            chances.enemyShip +
            asteroidBelt +
            chances.storm +
            distressSignal +
            derelictShip +
            gasGiant,
        boss:
            chances.station +
            chances.friendlyShip +
            planet +
            chances.enemyShip +
            asteroidBelt +
            chances.storm +
            distressSignal +
            derelictShip +
            gasGiant +
            chances.boss,
    };

    if (roll < thresholds.station) return "station";
    if (roll < thresholds.friendlyShip) return "friendly_ship";
    if (roll < thresholds.planet) return "planet";
    if (roll < thresholds.enemy) return "enemy";
    if (roll < thresholds.asteroidBelt) return "asteroid_belt";
    if (roll < thresholds.storm) return "storm";
    if (roll < thresholds.distressSignal) return "distress_signal";
    if (roll < thresholds.derelictShip) return "derelict_ship";
    // Don't spawn a gas_giant location in a sector whose star is already a gas_giant
    if (roll < thresholds.gasGiant) return starType === "gas_giant" ? "derelict_ship" : "gas_giant";
    if (roll < thresholds.boss) return "boss";
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
        case "boss":
            return generateBossOrAnomaly(sectorIdx, locIdx, tier, isBlackHole);
        case "anomaly":
        default:
            return generateAnomaly(sectorIdx, locIdx, tier, isBlackHole);
    }
};
