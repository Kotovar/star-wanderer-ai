import { WEAPON_TYPES } from "@/game/constants/weapons";
import { STATION_CONFIG } from "@/game/galaxy/config";
import { getNavigatorLocationKey } from "@/game/types/navigator";
import { calculateFuelCostForUI } from "@/game/slices/travel/helpers/calculateFuelCost";
import type { GameState, Location, Module, Sector } from "@/game/types";

export const FRONTIER_CONTRACT_TARGET = 2;
export const FRONTIER_WEAPON_BAY_DISCOUNT = 200;
export const FRONTIER_WEAPON_DISCOUNT = 300;

export type ContractGenerationContext = {
  canOfferCombat: boolean;
  allowFrontier: boolean;
  sourceReputation?: number;
};

export const hasCombatArmament = (modules: Module[]): boolean =>
  modules.some(
    (module) =>
      module.type === "weaponbay" &&
      module.weapons?.some((weapon) => weapon && WEAPON_TYPES[weapon.type]) &&
      !module.disabled &&
      !module.manualDisabled &&
      module.health > 0,
  );

type StationCandidate = {
  sector: Sector;
  location: Location;
};

const getContactStationCandidates = (state: GameState): StationCandidate[] =>
  state.galaxy.sectors.flatMap((sector) =>
    sector.tier === 1 && sector.star?.type !== "blackhole"
      ? sector.locations
          .filter((location) => location.type === "station")
          .map((location) => ({ sector, location }))
      : [],
  );

const byFuelThenSector = (state: GameState) =>
  (left: StationCandidate, right: StationCandidate): number => {
    const fuelDifference =
      calculateFuelCostForUI(state, left.sector.id).fuelCost -
      calculateFuelCostForUI(state, right.sector.id).fuelCost;
    return fuelDifference || left.sector.id - right.sector.id;
  };

/** Creates the military-contact state without mutating the current save. */
export const getFrontierContactPatch = (
  state: GameState,
): Pick<
  GameState,
  "galaxy" | "currentSector" | "knownLocationIntel" | "navigatorTargets" | "frontierSubsidy"
> | null => {
  if (
    state.frontierContractsCompleted !== FRONTIER_CONTRACT_TARGET ||
    state.frontierSubsidy
  ) {
    return null;
  }

  const candidates = getContactStationCandidates(state);
  const militaryCandidates = candidates.filter(
    ({ location }) => location.stationType === "military",
  );
  const fallbackCandidates = candidates.filter(
    ({ location }) =>
      location.stationType !== "shipyard" && location.stationType !== "medical",
  );
  const serviceCounts = candidates.reduce<Record<string, number>>(
    (counts, { location }) => ({
      ...counts,
      [location.stationType ?? ""]:
        (counts[location.stationType ?? ""] ?? 0) + 1,
    }),
    {},
  );
  const redundantServiceCandidates = candidates.filter(
    ({ location }) =>
      (location.stationType === "shipyard" || location.stationType === "medical") &&
      serviceCounts[location.stationType] > 1,
  );
  const target = (
    militaryCandidates.length
      ? militaryCandidates
      : fallbackCandidates.length
        ? fallbackCandidates
        : redundantServiceCandidates
  ).sort(byFuelThenSector(state))[0];
  if (!target) return null;

  const converted = militaryCandidates.length === 0;
  const targetLocation = converted
    ? {
        ...target.location,
        stationType: "military" as const,
        stationConfig: STATION_CONFIG.military,
      }
    : target.location;
  const patchedSector = converted
    ? {
        ...target.sector,
        locations: target.sector.locations.map((location) =>
          location.id === target.location.id ? targetLocation : location,
        ),
      }
    : target.sector;
  const sectors = converted
    ? state.galaxy.sectors.map((sector) =>
        sector.id === target.sector.id ? patchedSector : sector,
      )
    : state.galaxy.sectors;
  const key = getNavigatorLocationKey(target.sector.id, targetLocation.id);
  const navigatorTargets = state.navigatorTargets.some(
    (navigatorTarget) =>
      getNavigatorLocationKey(
        navigatorTarget.sectorId,
        navigatorTarget.locationId,
      ) === key,
  )
    ? state.navigatorTargets
    : [
        ...state.navigatorTargets,
        { sectorId: target.sector.id, locationId: targetLocation.id },
      ];

  return {
    galaxy: { ...state.galaxy, sectors },
    currentSector:
      converted && state.currentSector?.id === target.sector.id
        ? patchedSector
        : state.currentSector,
    knownLocationIntel: {
      ...state.knownLocationIntel,
      [key]:
        state.knownLocationIntel[key] ?? {
          sectorId: target.sector.id,
          locationId: targetLocation.id,
          highestScanRange: 0,
          visited: false,
        },
    },
    navigatorTargets,
    frontierSubsidy: {
      targetStationId: targetLocation.stationId ?? targetLocation.id,
      weaponBayAvailable: true,
      weaponAvailable: true,
    },
  };
};
