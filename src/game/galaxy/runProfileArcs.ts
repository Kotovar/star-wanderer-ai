import { getRunProfile, type RunProfile, type RunProfileId } from "./runProfiles";
import { isLocationCountedAsVisited } from "@/game/progression/locationProgress";
import type { Sector } from "@/game/types";

export interface RunProfileArcProgress {
  profile: RunProfile;
  reward: RunProfile["arc"]["reward"];
  completed: number;
  target: number;
  milestones: RunProfile["arc"]["milestones"];
  reachedMilestones: number;
  isComplete: boolean;
}

export function getRunProfileArcProgress(
  profileId: RunProfileId | null,
  sectors: Sector[],
  completedLocations: string[],
): RunProfileArcProgress | null {
  const profile = getRunProfile(profileId);
  if (!profile) return null;

  const target = profile.arc.milestones.at(-1) ?? 0;
  const completed = Math.min(
    target,
    sectors.flatMap((sector) => sector.locations).filter(
      (location) =>
        profile.arc.locationTypes.includes(location.type) &&
        isLocationCountedAsVisited(location, completedLocations),
    ).length,
  );

  return {
    profile,
    reward: profile.arc.reward,
    completed,
    target,
    milestones: profile.arc.milestones,
    reachedMilestones: profile.arc.milestones.filter(
      (milestone) => completed >= milestone,
    ).length,
    isComplete: completed >= target,
  };
}
