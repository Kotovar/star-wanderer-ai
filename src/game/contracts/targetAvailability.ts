import { RESEARCH_TREE } from "@/game/constants/research";
import type { Contract, GameState, Sector, TechnologyId } from "@/game/types";

export type ContractTargetContext = Pick<GameState, "artifacts"> & {
    researchedTechs: GameState["research"]["researchedTechs"];
};

/**
 * Проверяет, существует ли ещё цель контракта в галактике.
 *
 * Контракты генерируются один раз при создании галактики и ссылаются на
 * снимок мира: враги погибают, штормы проходятся (одноразово). Принятие
 * контракта с мёртвой целью гарантирует провал (для расовых — штраф
 * репутации), поэтому такие контракты нельзя ни показывать, ни принимать.
 *
 * @param contract - Проверяемый контракт
 * @param sectors - Сектора галактики
 * @param completedLocations - ID пройденных локаций (штормы одноразовы)
 * @param context - Находки и исследования игрока
 * @returns true, если цель контракта всё ещё достижима
 */
export const isContractTargetAvailable = (
    contract: Contract,
    sectors: Sector[],
    completedLocations: string[],
    context: ContractTargetContext,
): boolean => {
    switch (contract.type) {
        case "scan_planet": {
            if (!contract.planetType) return false;
            const remaining = Math.max(
                0,
                (contract.requiresVisit ?? 1) - (contract.visited ?? 0),
            );
            if (remaining === 0) return true;

            const scannedPlanetIds = new Set(contract.scannedPlanetIds);
            return (
                sectors
                    .filter((sector) => (sector.tier ?? 1) < 4)
                    .flatMap((sector) => sector.locations)
                    .filter(
                        (location) =>
                            location.type === "planet" &&
                            location.planetType === contract.planetType &&
                            !scannedPlanetIds.has(location.id),
                    ).length >= remaining
            );
        }
        case "combat": {
            // Победа в бою в заданном секторе — нужен хоть один живой враг
            if (contract.sectorId === undefined) return true;
            const sector = sectors.find((s) => s.id === contract.sectorId);
            return !!sector?.locations.some(
                (l) => l.type === "enemy" && !l.defeated,
            );
        }
        case "bounty": {
            // Нужен живой враг с угрозой не ниже требуемой
            if (contract.targetSector === undefined) return true;
            const sector = sectors.find((s) => s.id === contract.targetSector);
            return !!sector?.locations.some(
                (l) =>
                    l.type === "enemy" &&
                    !l.defeated &&
                    (l.threat ?? 1) >= (contract.targetThreat ?? 1),
            );
        }
        case "rescue": {
            // Вход в шторм нужной силы — штормы одноразовы
            if (contract.targetLocationId) {
                return sectors.some((sector) =>
                    sector.locations.some(
                        (location) =>
                            location.id === contract.targetLocationId &&
                            location.type === "storm" &&
                            (location.stormIntensity ?? 1) >=
                                (contract.requiredStormIntensity ?? 1) &&
                            !completedLocations.includes(location.id),
                    ),
                );
            }
            if (contract.sectorId === undefined) return true;
            const sector = sectors.find((s) => s.id === contract.sectorId);
            return !!sector?.locations.some(
                (l) =>
                    l.type === "storm" &&
                    (l.stormIntensity ?? 1) >=
                        (contract.requiredStormIntensity ?? 1) &&
                    !completedLocations.includes(l.id),
            );
        }
        case "research": {
            if (contract.requiresTechResearch) {
                const minTier = contract.requiredTechTier ?? 1;
                return Object.entries(RESEARCH_TREE).some(
                    ([techId, technology]) =>
                        technology.tier >= minTier &&
                        !context.researchedTechs.includes(
                            techId as TechnologyId,
                        ),
                );
            }

            const remaining = Math.max(
                0,
                (contract.requiresAnomalies ?? 1) -
                    (contract.visitedAnomalies ?? 0),
            );
            if (remaining === 0) return true;
            return (
                sectors
                    .flatMap((sector) => sector.locations)
                    .filter(
                        (location) =>
                            location.type === "anomaly" &&
                            !completedLocations.includes(location.id),
                    ).length >= remaining
            );
        }
        case "mining":
            return context.artifacts.some(
                (artifact) =>
                    !artifact.discovered &&
                    (!contract.requiredRarities ||
                        contract.requiredRarities.includes(artifact.rarity)),
            );
        case "expedition_survey": {
            if (contract.expeditionDone) return true;
            if (!contract.targetPlanetId) return false;
            return sectors.some((sector) =>
                sector.locations.some(
                    (location) =>
                        location.id === contract.targetPlanetId &&
                        location.type === "planet" &&
                        !location.isEmpty &&
                        !location.expeditionCompleted,
                ),
            );
        }
        case "derelict_recovery": {
            if (!contract.targetLocationId) return false;
            return sectors.some((sector) =>
                sector.locations.some(
                    (location) =>
                        location.id === contract.targetLocationId &&
                        location.type === "derelict_ship" &&
                        !location.derelictExplored,
                ),
            );
        }
        default:
            return true;
    }
};
