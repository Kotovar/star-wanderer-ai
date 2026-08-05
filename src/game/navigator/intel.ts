import { canScanObject } from "@/game/slices/scanner/helpers/canScanObject";
import { getEffectiveScanRange } from "@/game/slices/scanner/helpers/getEffectiveScanRange";
import type { GameState, Sector } from "@/game/types";
import {
  getNavigatorLocationKey,
  type KnownLocationIntel,
  type NavigatorTarget,
} from "@/game/types/navigator";

export { getNavigatorLocationKey } from "@/game/types/navigator";

export const collectNavigatorIntel = (
  state: GameState,
  sector: Sector,
): Record<string, KnownLocationIntel> => {
  const knownLocationIntel = { ...state.knownLocationIntel };
  const scanRange = getEffectiveScanRange(state);

  for (const location of sector.locations) {
    if (
      !location.visited &&
      !canScanObject(state, location.type, location.threat ?? location.anomalyTier)
    ) {
      continue;
    }

    const key = getNavigatorLocationKey(sector.id, location.id);
    const current = knownLocationIntel[key];
    knownLocationIntel[key] = {
      sectorId: sector.id,
      locationId: location.id,
      highestScanRange: Math.max(
        current?.highestScanRange ?? 0,
        location.visited ? 8 : scanRange,
      ),
      visited: current?.visited || Boolean(location.visited),
    };
  }

  return knownLocationIntel;
};

export const getVisibleNavigatorTargetIds = (
  targets: NavigatorTarget[],
  sectorId: number,
  knownLocationIntel: Record<string, KnownLocationIntel>,
): string[] => {
  const targetIds = new Set<string>();

  for (const target of targets) {
    if (
      target.sectorId === sectorId &&
      knownLocationIntel[
        getNavigatorLocationKey(target.sectorId, target.locationId)
      ]
    ) {
      targetIds.add(target.locationId);
    }
  }

  return [...targetIds];
};

export const hydrateNavigatorIntelFromLegacyState = (
  state: Pick<GameState, "galaxy" | "knownTradeStations">,
): {
  knownLocationIntel: Record<string, KnownLocationIntel>;
  navigatorTargets: NavigatorTarget[];
  knownTradeStations: string[];
} => {
  const knownLocationIntel: Record<string, KnownLocationIntel> = {};
  const knownStationIds = new Set(state.knownTradeStations);
  const knownTradeStations: string[] = [];

  for (const sector of state.galaxy.sectors) {
    for (const location of sector.locations) {
      if (!location.visited) continue;

      knownLocationIntel[getNavigatorLocationKey(sector.id, location.id)] = {
        sectorId: sector.id,
        locationId: location.id,
        highestScanRange: 8,
        visited: true,
      };

      if (
        location.type === "station" &&
        location.stationId &&
        knownStationIds.has(location.stationId)
      ) {
        knownTradeStations.push(location.stationId);
      }
    }
  }

  return { knownLocationIntel, navigatorTargets: [], knownTradeStations };
};
