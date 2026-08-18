import type { FriendlyShipTypeId, Sector } from "../types";
import type { RaceId } from "../types/races";
import type { Contract } from "../types/contracts";
import { TRADE_GOODS } from "../constants/goods";
import { DELIVERY_GOODS, EXPEDITION_DISCOVERIES } from "../constants/contracts";
import { PLANET_TYPES } from "../constants/planets";
import { getFriendlyShipType } from "../galaxy/consts";
import { getTierPriceMultiplier } from "@/game/slices/trade/constants";
import { typedKeys } from "@/lib/utils";
import { getGeneratedContractTimeLimit } from "./contractDeadline";
import { CONTRACT_REWARDS } from "./rewards";

const generateShipQuest = (
    shipId: string,
    shipName: string,
    shipRace: RaceId | undefined,
    shipType: FriendlyShipTypeId | undefined,
    shipSectorId: number,
    allSectors: Sector[],
): Contract | null => {
    const shipSector = allSectors.find((s) => s.id === shipSectorId);
    const shipSectorName = shipSector?.name ?? "";
    const shipTier = shipSector?.tier ?? 1;
    const otherSectors = allSectors.filter(
        (s) => s.id !== shipSectorId && s.tier < 4,
    );
    if (otherSectors.length === 0) return null;

    const source = {
        sourcePlanetId: shipId,
        sourceName: shipName,
        sourceSectorName: shipSectorName,
        sourceType: "ship" as const,
        sourceDominantRace: shipRace,
    };

    const questTypes = getFriendlyShipType(shipType)?.questTypes;
    const roll = Math.random();
    const questType = questTypes
        ? questTypes[Math.floor(roll * questTypes.length)]
        : roll < 0.5
          ? "delivery"
          : roll < 0.75
            ? "supply_run"
            : "scan_planet";

    const targetSector = otherSectors[Math.floor(Math.random() * otherSectors.length)];

    if (questType === "scan_planet") {
        const targetType = PLANET_TYPES[Math.floor(Math.random() * PLANET_TYPES.length)];
        const targetSectors = otherSectors.filter((s) =>
            s.locations.some((l) => l.type === "planet" && l.planetType === targetType),
        );
        if (targetSectors.length === 0) return null;
        const tgt = targetSectors[Math.floor(Math.random() * targetSectors.length)];
        const targetPlanet = tgt.locations.find(
            (l) => l.type === "planet" && l.planetType === targetType,
        );
        return {
            id: `ship-${shipId}-scan-${Date.now()}-${Math.random()}`,
            type: "scan_planet",
            desc: `📡 Найти и отсканировать планету: ${targetType}`,
            planetType: targetType,
            targetSector: tgt.id,
            targetSectorName: tgt.name,
            targetPlanetId: targetPlanet?.id,
            targetPlanetName: targetPlanet?.name,
            ...source,
            requiresVisit: 1,
            visited: 0,
            requiresScanner: true,
            reward: 400 + Math.floor(Math.random() * 200),
        };
    }

    if (questType === "supply_run") {
        const goodsKeys = typedKeys(TRADE_GOODS);
        const cargoKey = goodsKeys[Math.floor(Math.random() * goodsKeys.length)];
        const cargo = TRADE_GOODS[cargoKey];
        const quantity = [10, 15, 20][Math.floor(Math.random() * 3)];
        // Закупка дорожает с тиром сектора корабля — награда масштабируется той же ставкой
        const stationBuyPrice = Math.floor(
            cargo.basePrice * getTierPriceMultiplier(shipTier) * 0.4,
        );
        const reward = Math.floor(stationBuyPrice * quantity * 1.3);
        return {
            id: `ship-${shipId}-supply-${Date.now()}-${Math.random()}`,
            type: "supply_run",
            desc: `📦 Поставка ресурсов: ${cargo.name} (${quantity}т)`,
            cargo: cargoKey,
            quantity,
            ...source,
            reward,
        };
    }

    if (questType === "expedition_survey") {
        const candidatePlanets = otherSectors.flatMap((sector) =>
            sector.locations
                .filter(
                    (location) =>
                        location.type === "planet" &&
                        !location.isEmpty &&
                        !location.expeditionCompleted,
                )
                .map((planet) => ({ planet, sector })),
        );
        if (candidatePlanets.length === 0) return null;

        const target =
            candidatePlanets[Math.floor(Math.random() * candidatePlanets.length)];
        const expeditionTierIndex = Math.min(
            shipTier - 1,
            EXPEDITION_DISCOVERIES.length - 1,
        );
        return {
            id: `ship-${shipId}-expedition-${Date.now()}-${Math.random()}`,
            type: "expedition_survey",
            desc: "contracts.desc_expedition_survey",
            targetPlanetId: target.planet.id,
            targetPlanetName: target.planet.name,
            targetSector: target.sector.id,
            targetSectorName: target.sector.name,
            requiredDiscoveries: EXPEDITION_DISCOVERIES[expeditionTierIndex],
            expeditionDone: false,
            ...source,
            timeLimit: getGeneratedContractTimeLimit(
                "expedition_survey",
                shipTier,
                target.sector.tier ?? shipTier,
            ),
            reward:
                CONTRACT_REWARDS.expedition_survey.base[expeditionTierIndex] +
                Math.floor(
                    Math.random() * CONTRACT_REWARDS.expedition_survey.range[expeditionTierIndex],
                ),
        };
    }

    // delivery
    const deliveryGoodsKeys = typedKeys(DELIVERY_GOODS);
    const cargoKey = deliveryGoodsKeys[Math.floor(Math.random() * deliveryGoodsKeys.length)];
    const cargoName = DELIVERY_GOODS[cargoKey].name;
    const validDestinations = targetSector.locations.filter(
        (l) =>
            (l.type === "planet" && !l.isEmpty) ||
            l.type === "station" ||
            l.type === "friendly_ship",
    );
    if (validDestinations.length === 0) return null;
    const dest = validDestinations[Math.floor(Math.random() * validDestinations.length)];
    const destType =
        dest.type === "planet" ? "planet" : dest.type === "station" ? "station" : "ship";
    return {
        id: `ship-${shipId}-delivery-${Date.now()}-${Math.random()}`,
        type: "delivery",
        desc: `📦 Доставка: ${cargoName}`,
        cargo: cargoKey,
        reward: 400 + Math.floor(Math.random() * 200),
        targetSector: targetSector.id,
        targetSectorName: targetSector.name,
        targetLocationId: dest.id,
        targetLocationName: dest.name,
        targetLocationType: destType,
        ...source,
        timeLimit: getGeneratedContractTimeLimit(
            "delivery",
            shipTier,
            targetSector.tier ?? shipTier,
        ),
    };
};

/**
 * Генерирует задания для дружественных кораблей при создании галактики.
 * Вызывается один раз — задание хранится в location.pregeneratedQuest.
 */
export const populateShipQuests = (sectors: Sector[]): void => {
    sectors.forEach((sector) => {
        sector.locations.forEach((loc) => {
            if (loc.type === "friendly_ship" && loc.hasQuest) {
                loc.pregeneratedQuest =
                    generateShipQuest(
                        loc.id,
                        loc.name,
                        loc.dominantRace,
                        loc.friendlyShipType,
                        sector.id,
                        sectors,
                    ) ?? undefined;
            }
        });
    });
};
