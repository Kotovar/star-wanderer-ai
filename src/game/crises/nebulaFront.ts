import type { ActiveCrisisState } from "@/game/types/crisis";
import type { Nebula } from "@/game/types/locations";
import type { ResearchResourceType } from "@/game/types/research";

export const NEBULA_FRONT_CRISIS_ID = "nebula_front";
export const NEBULA_FRONT_NEBULA_COUNT = 3;

export const NEBULA_FRONT_STABILIZER_COST = {
  quantum_crystals: 10,
  energy_samples: 25,
  void_membrane: 3,
} satisfies Partial<Record<ResearchResourceType, number>>;

export interface NebulaFrontProgress {
  total: number;
  dispersed: number;
  remaining: number;
}

const getNebulaIds = (activeCrisis: ActiveCrisisState | null): string[] | null => {
  if (activeCrisis?.id !== NEBULA_FRONT_CRISIS_ID) return null;
  const nebulaIds = activeCrisis.data?.nebulaIds;
  return Array.isArray(nebulaIds) && nebulaIds.every((id) => typeof id === "string")
    ? nebulaIds
    : null;
};

export const canStartNebulaFront = (
  currentTier: number | undefined,
  discoveredCrisisIds: readonly string[],
): boolean =>
  (currentTier ?? 1) >= 2 &&
  !discoveredCrisisIds.includes(NEBULA_FRONT_CRISIS_ID);

export const hasNebulaFrontMaterials = (
  resources: Partial<Record<ResearchResourceType, number>>,
): boolean =>
  (resources.quantum_crystals ?? 0) >=
    NEBULA_FRONT_STABILIZER_COST.quantum_crystals &&
  (resources.energy_samples ?? 0) >=
    NEBULA_FRONT_STABILIZER_COST.energy_samples &&
  (resources.void_membrane ?? 0) >=
    NEBULA_FRONT_STABILIZER_COST.void_membrane;

export const getNebulaFrontProgress = (
  activeCrisis: ActiveCrisisState | null,
  nebulae: Nebula[],
): NebulaFrontProgress | null => {
  const nebulaIds = getNebulaIds(activeCrisis);
  if (!nebulaIds) return null;

  const activeNebulaIds = new Set(nebulae.map((nebula) => nebula.id));
  const remaining = nebulaIds.filter((id) => activeNebulaIds.has(id)).length;
  return {
    total: nebulaIds.length,
    dispersed: nebulaIds.length - remaining,
    remaining,
  };
};

export const getNebulaFrontDispersal = (
  activeCrisis: ActiveCrisisState | null,
  nebulae: Nebula[],
  resources: Partial<Record<ResearchResourceType, number>>,
  isResearchStation: boolean,
): string | null => {
  if (!isResearchStation || !hasNebulaFrontMaterials(resources)) return null;

  const nebulaIds = getNebulaIds(activeCrisis);
  if (!nebulaIds) return null;

  const activeNebulaIds = new Set(nebulae.map((nebula) => nebula.id));
  return nebulaIds.find((id) => activeNebulaIds.has(id)) ?? null;
};
