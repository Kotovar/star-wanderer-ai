import type { GalaxyTierAll, Sector } from "@/game/types";

export type TierAccessRequirements = {
  tier: GalaxyTierAll;
  engineLevel: number;
  captainLevel: number;
};

const TIER_ACCESS_LEVELS = {
  1: 1,
  2: 2,
  3: 3,
  4: 4,
} as const satisfies Record<GalaxyTierAll, number>;

export function getHighestReachedTier(
  sectors: readonly Pick<Sector, "tier" | "visited">[],
  currentSector: Pick<Sector, "tier"> | null | undefined,
): GalaxyTierAll {
  return sectors.reduce<GalaxyTierAll>(
    (highestTier, sector) =>
      sector.visited && sector.tier > highestTier ? sector.tier : highestTier,
    currentSector?.tier ?? 1,
  );
}

export function getTierAccessRequirements(
  tier: GalaxyTierAll,
): TierAccessRequirements {
  const level = TIER_ACCESS_LEVELS[tier];
  return { tier, engineLevel: level, captainLevel: level };
}

export function getNextTierAccessRequirements(
  highestReachedTier: GalaxyTierAll,
): TierAccessRequirements | null {
  if (highestReachedTier === 4) return null;
  return getTierAccessRequirements((highestReachedTier + 1) as GalaxyTierAll);
}
