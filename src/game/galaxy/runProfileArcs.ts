import {
  getRunProfile,
  RUN_PROFILES,
  type RunProfile,
  type RunProfileId,
} from "./runProfiles";
import { assignGridPositions } from "@/game/sectorGrid/assignGridPositions";
import { store as i18nStore } from "@/lib/useTranslation";
import { getSectorName } from "@/lib/translationHelpers";
import type {
  GameState,
  GameStore,
  GalaxyTierAll,
  Location,
  ResearchResourceType,
  Sector,
  SetState,
} from "@/game/types";

export interface RunProfileArcProgress {
  profile: RunProfile;
  confirmedSectorIds: number[];
  confirmed: number;
  target: 3;
  isReady: boolean;
}

export function isRunProfileArcSignal(
  profileId: RunProfileId | null,
  location: Location,
  completedLocations: string[],
): boolean {
  switch (profileId) {
    case "ancient_echo":
      return (
        (location.type === "anomaly" && completedLocations.includes(location.id)) ||
        (location.type === "gas_giant" && location.gasGiantLastDiveAt !== undefined)
      );
    case "war_spiral":
      return (
        (location.type === "enemy" && location.defeated === true) ||
        (location.type === "space_monster" &&
          location.spaceMonsterResolved === "hunted")
      );
    case "broken_trade_lanes":
      return (
        (location.type === "distress_signal" && location.signalResolved === true) ||
        (location.type === "derelict_ship" && location.derelictExplored === true) ||
        (location.type === "wreck_field" && location.wreckExhausted === true)
      );
    default:
      return false;
  }
}

export function getRunProfileArcProgress(
  profileId: RunProfileId | null,
  sectors: Sector[],
  completedLocations: string[],
): RunProfileArcProgress | null {
  const profile = getRunProfile(profileId);
  if (!profile) return null;

  const confirmedSectorIds = sectors
    .filter((sector) =>
      sector.locations.some((location) =>
        isRunProfileArcSignal(profileId, location, completedLocations),
      ),
    )
    .slice(0, 3)
    .map((sector) => sector.id);
  const confirmed = confirmedSectorIds.length;

  return {
    profile,
    confirmedSectorIds,
    confirmed,
    target: 3,
    isReady: confirmed === 3,
  };
}

type RunProfileArcTargetState = Pick<
  GameState,
  | "runProfileId"
  | "runProfileArcRewardClaimed"
  | "runProfileArcTarget"
  | "galaxy"
  | "currentSector"
  | "completedLocations"
>;

type MutableSetState = (updater: (state: GameState) => void) => void;

export function getRunProfileArcTargetPatch(
  state: RunProfileArcTargetState,
): Pick<GameState, "galaxy" | "currentSector" | "runProfileArcTarget"> | null {
  if (
    !state.runProfileId ||
    state.runProfileArcRewardClaimed ||
    state.runProfileArcTarget
  ) {
    return null;
  }

  const progress = getRunProfileArcProgress(
    state.runProfileId,
    state.galaxy.sectors,
    state.completedLocations,
  );
  if (!progress?.isReady) return null;

  const confirmedSectorIds = new Set(progress.confirmedSectorIds);
  const confirmedSectors = state.galaxy.sectors.filter((sector) =>
    confirmedSectorIds.has(sector.id),
  );
  const highestConfirmedTier = Math.max(
    ...confirmedSectors.map((sector) => sector.tier),
  );
  const tier = Math.min(4, highestConfirmedTier + 1) as GalaxyTierAll;
  const tierSectors = state.galaxy.sectors.filter(
    (sector) => sector.tier === tier,
  );
  const eligibleSectors = tierSectors.filter(
    (sector) => sector.star.type !== "blackhole",
  );
  const candidateSectors =
    eligibleSectors.length > 0 ? eligibleSectors : tierSectors;
  const targetSector =
    candidateSectors[Math.floor(Math.random() * candidateSectors.length)];
  if (!targetSector) return null;

  const locationId = `profile-signal-${state.runProfileId}-${targetSector.id}`;
  if (targetSector.locations.some((location) => location.id === locationId)) {
    return null;
  }

  const locations = targetSector.locations.map((location) => ({ ...location }));
  locations.push({
    id: locationId,
    type: "profile_signal",
    name: "location_types.profile_signal",
    threat: Math.min(6, tier + 1),
  });
  assignGridPositions(locations, true);

  const updatedSector = { ...targetSector, locations };
  const sectors = state.galaxy.sectors.map((sector) =>
    sector.id === updatedSector.id ? updatedSector : sector,
  );

  return {
    galaxy: { ...state.galaxy, sectors },
    currentSector:
      state.currentSector?.id === updatedSector.id
        ? updatedSector
        : state.currentSector,
    runProfileArcTarget: {
      profileId: state.runProfileId,
      sectorId: updatedSector.id,
      locationId,
      tier,
    },
  };
}

export function maybeRevealRunProfileArcTarget(
  set: SetState,
  get: () => GameStore,
): void;
export function maybeRevealRunProfileArcTarget(
  set: MutableSetState,
  get: () => GameStore,
): void;
export function maybeRevealRunProfileArcTarget(
  set: SetState | MutableSetState,
  get: () => GameStore,
): void {
  const patch = getRunProfileArcTargetPatch(get());
  if (!patch?.runProfileArcTarget) return;

  (set as MutableSetState)(() => patch);

  const targetSector = patch.galaxy.sectors.find(
    (sector) => sector.id === patch.runProfileArcTarget?.sectorId,
  );
  get().addLog(
    i18nStore.t("game_logs.profile_signal_coordinates", {
      sector: targetSector ? getSectorName(targetSector.name, i18nStore.t) : "—",
      tier: patch.runProfileArcTarget.tier,
    }),
    "info",
  );
  get().saveGame();
}

export function getRunProfileArcEncounter(
  target: NonNullable<GameState["runProfileArcTarget"]>,
): Pick<Location, "enemyType" | "name" | "signalRevealed" | "threat"> {
  const profile = RUN_PROFILES[target.profileId];

  return {
    enemyType: profile.arc.enemyType,
    name: i18nStore.t(profile.arc.bossNameKey),
    signalRevealed: true,
    threat: Math.min(6, target.tier + 1),
  };
}

type RunProfileArcRewardState = Pick<
  GameState,
  | "currentLocation"
  | "research"
  | "runProfileArcRewardClaimed"
  | "runProfileArcTarget"
>;

export function getRunProfileArcRewardPatch(
  state: RunProfileArcRewardState,
): Pick<GameState, "research" | "runProfileArcRewardClaimed"> | null {
  const target = state.runProfileArcTarget;
  if (
    !target ||
    state.runProfileArcRewardClaimed ||
    state.currentLocation?.id !== target.locationId ||
    state.currentLocation.defeated !== true
  ) {
    return null;
  }

  const resources = { ...state.research.resources };
  for (const [resource, amount] of Object.entries(
    RUN_PROFILES[target.profileId].arc.reward,
  ) as [ResearchResourceType, number][]) {
    resources[resource] = (resources[resource] ?? 0) + amount;
  }

  return {
    research: { ...state.research, resources },
    runProfileArcRewardClaimed: true,
  };
}
