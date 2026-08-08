import type { Contract } from "@/game/types";
import {
  getLocationName,
  getSectorNames,
  getWeaponTypeName,
} from "@/lib/translationHelpers";

type ContractDescription = Pick<
  Contract,
  | "cargo"
  | "crisisName"
  | "desc"
  | "requiredWeaponType"
  | "planetType"
  | "quantity"
  | "requiredDiscoveries"
  | "requiredMembranes"
  | "requiresAnomalies"
  | "requiresVisit"
  | "sectorName"
  | "stormName"
  | "targetPlanetName"
  | "targetPlanetType"
  | "targetSectorNames"
  | "targetSectorName"
  | "targetSectors"
  | "targetThreat"
  | "visited"
  | "visitedAnomalies"
  | "visitedSectors"
>;

type Translate = (
  key: string,
  params?: Record<string, string | number>,
) => string;

export const formatContractDescription = (
  contract: ContractDescription,
  t: Translate,
): string =>
  t(contract.desc, {
    planetType: contract.planetType ?? "",
    count:
      contract.requiresVisit ??
      contract.requiresAnomalies ??
      contract.requiredDiscoveries ??
      contract.requiredMembranes ??
      0,
    cargo: contract.cargo ?? "",
    progress: contract.visited ?? contract.visitedAnomalies ?? 0,
    quantity: contract.quantity ?? "",
    amount: contract.quantity ?? "",
    sector: getLocationName(
      contract.targetSectorName ?? contract.sectorName ?? "",
      t,
    ),
    threat: contract.targetThreat ?? "",
    planet: getLocationName(contract.targetPlanetName ?? "", t),
    type: contract.targetPlanetType ?? "",
    sectors: getSectorNames(contract.targetSectorNames ?? "", t),
    visited: contract.visitedSectors?.length ?? 0,
    target: contract.targetSectors?.length ?? 0,
    stormName: contract.stormName ?? "",
    sectorName: getLocationName(contract.sectorName ?? "", t),
    crisis: contract.crisisName ? t(contract.crisisName) : "",
    weapon: getWeaponTypeName(contract.requiredWeaponType, t),
  });
