import type { Contract } from "@/game/types";
import {
  getDeliveryGoodName,
  getLocationName,
  getPlanetTypeName,
  getSectorNames,
  getTradeGoodName,
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
  | "targetLocationName"
  | "sourcePlanetName"
  | "targetSectorNames"
  | "targetSectorName"
  | "targetSectors"
  | "targetThreat"
  | "type"
  | "visited"
  | "visitedAnomalies"
  | "visitedSectors"
>;

type Translate = (
  key: string,
  params?: Record<string, string | number>,
) => string;

export const formatResearchTechRequirement = (
  requiredTier: number,
  t: Translate,
): string =>
  t(
    requiredTier >= 3
      ? "contracts.research_tech_elite"
      : requiredTier >= 2
        ? "contracts.research_tech_advanced"
        : "contracts.research_tech_basic",
  );

export const formatPirateReturnInstruction = (
  contract: Pick<
    Contract,
    "pirateObjectiveComplete" | "sourcePlanetName" | "sourceSectorName"
  >,
  t: Translate,
): string =>
  t(
    contract.pirateObjectiveComplete
      ? "pirate.objective_return"
      : "pirate.objective_after_action_return",
    {
      issuer: getLocationName(contract.sourcePlanetName ?? "", t),
      sector: getLocationName(contract.sourceSectorName ?? "", t),
    },
  );

export const formatContractDescription = (
  contract: ContractDescription,
  t: Translate,
): string => {
  const descriptionKey =
    contract.type === "delivery"
      ? "contracts.name_delivery"
      : contract.type === "supply_run"
        ? "contracts.name_supply"
        : contract.desc;

  return t(descriptionKey, {
    planetType: contract.planetType
      ? getPlanetTypeName(contract.planetType, t)
      : "",
    count:
      contract.requiresVisit ??
      contract.requiresAnomalies ??
      contract.requiredDiscoveries ??
      contract.requiredMembranes ??
      0,
    cargo:
      contract.type === "delivery"
        ? getDeliveryGoodName(contract.cargo, t)
        : getTradeGoodName(contract.cargo, t),
    progress: contract.visited ?? contract.visitedAnomalies ?? 0,
    quantity: contract.quantity ?? "",
    amount: contract.quantity ?? "",
    sector: getLocationName(
      contract.targetSectorName ?? contract.sectorName ?? "",
      t,
    ),
    threat: contract.targetThreat ?? "",
    planet: getLocationName(contract.targetPlanetName ?? "", t),
    type: contract.targetPlanetType
      ? getPlanetTypeName(contract.targetPlanetType, t)
      : "",
    sectors: getSectorNames(contract.targetSectorNames ?? "", t),
    visited: contract.visitedSectors?.length ?? 0,
    target:
      contract.targetLocationName
        ? getLocationName(contract.targetLocationName, t)
        : contract.targetSectors?.length ?? 0,
    issuer: getLocationName(contract.sourcePlanetName ?? "", t),
    stormName: contract.stormName ?? "",
    sectorName: getLocationName(contract.sectorName ?? "", t),
    crisis: contract.crisisName ? t(contract.crisisName) : "",
    weapon: getWeaponTypeName(contract.requiredWeaponType, t),
  });
};
