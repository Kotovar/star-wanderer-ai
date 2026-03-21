import type { Sector } from "../types";
import type { Contract } from "../types/contracts";
import { TRADE_GOODS } from "../constants/goods";
import { DELIVERY_GOODS } from "../constants/contracts";
import { typedKeys } from "@/lib/utils";

const PLANET_TYPES = [
    "Пустынная",
    "Ледяная",
    "Лесная",
    "Вулканическая",
    "Океаническая",
    "Тропическая",
    "Арктическая",
];

const generateShipQuest = (
    shipId: string,
    shipSectorId: number,
    allSectors: Sector[],
): Contract | null => {
    const otherSectors = allSectors.filter((s) => s.id !== shipSectorId);
    if (otherSectors.length === 0) return null;

    const roll = Math.random();
    const questType = roll < 0.5 ? "delivery" : roll < 0.75 ? "supply_run" : "scan_planet";

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
            sourcePlanetId: shipId,
            sourceName: "",
            sourceType: "ship",
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
        const stationBuyPrice = Math.floor(cargo.basePrice * 0.4);
        const reward = Math.floor(stationBuyPrice * quantity * 1.3);
        return {
            id: `ship-${shipId}-supply-${Date.now()}-${Math.random()}`,
            type: "supply_run",
            desc: `📦 Поставка ресурсов: ${cargo.name} (${quantity}т)`,
            cargo: cargoKey,
            quantity,
            sourcePlanetId: shipId,
            sourceName: "",
            sourceType: "ship",
            reward,
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
        sourcePlanetId: shipId,
        sourceName: "",
        sourceType: "ship",
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
                    generateShipQuest(loc.id, sector.id, sectors) ?? undefined;
            }
        });
    });
};
