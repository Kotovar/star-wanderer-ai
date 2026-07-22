import type { Contract } from "@/game/types";

type ContractDescription = Pick<
  Contract,
  | "cargo"
  | "desc"
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
    sector: contract.targetSectorName ?? contract.sectorName ?? "",
    threat: contract.targetThreat ?? "",
    planet: contract.targetPlanetName ?? "",
    type: contract.targetPlanetType ?? "",
    sectors: contract.targetSectorNames ?? "",
    visited: contract.visitedSectors?.length ?? 0,
    target: contract.targetSectors?.length ?? 0,
    stormName: contract.stormName ?? "",
    sectorName: contract.sectorName ?? "",
  });
