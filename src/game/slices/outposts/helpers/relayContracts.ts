import { BASE_SERVICE_VALUES } from "@/game/constants/baseModules";
import type { Contract, Sector } from "@/game/types";
import type { Outpost } from "@/game/types/outposts";
import { findBase, hasBaseService } from "./baseServices";

export interface RelayOffer {
    contract: Contract;
    sectorName: string;
    sectorTier: number;
    planetName: string;
}

/** Угловое расстояние между секторами по кольцу галактики */
const angleGap = (a: number, b: number): number => {
    const raw = Math.abs(a - b) % (Math.PI * 2);
    return Math.min(raw, Math.PI * 2 - raw);
};

/**
 * Соседние сектора: понятия соседства в галактике нет, поэтому вводим его
 * здесь — те, что рядом по углу и не дальше тира через один. Кольца тиров
 * вложены друг в друга, так что «рядом» — это близкий угол при близком тире.
 */
export function getNeighbourSectors(
    sectors: readonly Sector[],
    origin: Sector | undefined,
): Sector[] {
    if (!origin || origin.mapAngle === undefined) return [];
    return sectors
        .filter(
            (sector) =>
                sector.id !== origin.id &&
                sector.mapAngle !== undefined &&
                Math.abs(sector.tier - origin.tier) <= 1,
        )
        .sort(
            (a, b) =>
                angleGap(a.mapAngle ?? 0, origin.mapAngle ?? 0) -
                angleGap(b.mapAngle ?? 0, origin.mapAngle ?? 0),
        )
        .slice(0, BASE_SERVICE_VALUES.relaySectorReach);
}

/**
 * Что ловит ретранслятор.
 *
 * Контракты лежат на планетах с самой генерации галактики — их не нужно
 * создавать, нужно лишь дать игроку услышать их, не прилетая. В этом и была
 * задумка модуля: он платит не ресурсом, а знанием, куда стоит лететь.
 *
 * Свой сектор базы не показываем: там вы и так всё увидите, оказавшись рядом.
 */
export function getRelayOffers(
    outposts: readonly Outpost[],
    sectors: readonly Sector[],
): RelayOffer[] {
    const base = findBase(outposts);
    if (!hasBaseService(base, "relay")) return [];

    const origin = sectors.find((sector) => sector.id === base?.sectorId);
    const offers: RelayOffer[] = [];

    for (const sector of getNeighbourSectors(sectors, origin)) {
        for (const location of sector.locations) {
            for (const contract of location.contracts ?? []) {
                offers.push({
                    contract,
                    sectorName: sector.name,
                    sectorTier: sector.tier,
                    planetName: location.name,
                });
            }
        }
    }

    // Богатые предложения первыми: список нужен, чтобы выбрать маршрут, а не
    // чтобы пролистывать всё подряд
    return offers
        .sort((a, b) => (b.contract.reward ?? 0) - (a.contract.reward ?? 0))
        .slice(0, BASE_SERVICE_VALUES.relayOfferLimit);
}
