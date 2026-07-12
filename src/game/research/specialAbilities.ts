import type { TechnologyId } from "@/game/types";

export const PHASE_SHIELD_ABSORB_CHANCE = 0.2;

export function hasWarpTravel(researchedTechs: readonly TechnologyId[]): boolean {
  return researchedTechs.includes("warp_drive");
}

export function shouldPhaseShieldAbsorb(
  researchedTechs: readonly TechnologyId[],
  shields: number,
  maxShields: number,
  roll = Math.random(),
): boolean {
  return (
    researchedTechs.includes("phase_shield") &&
    maxShields > 0 &&
    shields >= maxShields * 0.2 &&
    roll < PHASE_SHIELD_ABSORB_CHANCE
  );
}
