// Без runtime-импортов: файл покрыт scripts/check-contract-targets.mjs,
// который запускается через node --experimental-strip-types.
import type { Contract, Sector } from "@/game/types";

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
 * @returns true, если цель контракта всё ещё достижима
 */
export const isContractTargetAvailable = (
    contract: Contract,
    sectors: Sector[],
    completedLocations: string[],
): boolean => {
    switch (contract.type) {
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
