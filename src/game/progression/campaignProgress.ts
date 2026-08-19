import type { GalaxyTierAll, Sector } from "@/game/types";
import { getContractTurnsRemaining } from "@/game/contracts/contractDeadline";
import type { Contract } from "@/game/types/contracts";
import type { ActiveCrisisState } from "@/game/types/crisis";

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

const URGENT_CONTRACT_TURNS = 2;

export type TacticalDirective =
  | { kind: "crisis"; turnsRemaining: number }
  | { kind: "contract"; turnsRemaining: number };

export function getTacticalDirective({
  activeCrisis,
  activeContracts,
  currentTurn,
}: {
  activeCrisis: Pick<ActiveCrisisState, "turnsRemaining"> | null | undefined;
  activeContracts: readonly Contract[];
  currentTurn: number;
}): TacticalDirective | null {
  if (activeCrisis) {
    return { kind: "crisis", turnsRemaining: activeCrisis.turnsRemaining };
  }

  let shortestDeadline: number | null = null;
  for (const contract of activeContracts) {
    const turnsRemaining = getContractTurnsRemaining(contract, currentTurn);
    if (
      turnsRemaining === null ||
      turnsRemaining > URGENT_CONTRACT_TURNS ||
      (shortestDeadline !== null && turnsRemaining >= shortestDeadline)
    ) {
      continue;
    }
    shortestDeadline = turnsRemaining;
  }

  return shortestDeadline === null
    ? null
    : { kind: "contract", turnsRemaining: shortestDeadline };
}

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
