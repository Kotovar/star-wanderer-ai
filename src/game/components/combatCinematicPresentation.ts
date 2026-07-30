import type { WeaponType } from "@/game/types";
import type { CombatProjectileOutcome } from "@/game/types/combatCinematics";

export type CombatCinematicProjectileVisual =
  | "beam"
  | "tracer"
  | "rocket"
  | "plasma"
  | "swarm"
  | "orbit"
  | "phase"
  | "arc"
  | "enemy";

export type CombatCinematicProjectileReadoutStatus =
  | "shield"
  | "hull"
  | "mixed"
  | "miss"
  | "intercepted"
  | "absorbed"
  | "blocked"
  | "piercing";

export interface CombatCinematicProjectileReadout {
  status: CombatCinematicProjectileReadoutStatus;
  shieldDamage: number;
  hullDamage: number;
}

const PROJECTILE_VISUALS = {
  laser: "beam",
  kinetic: "tracer",
  missile: "rocket",
  plasma: "plasma",
  drones: "swarm",
  antimatter: "orbit",
  quantum_torpedo: "phase",
  ion_cannon: "arc",
} as const satisfies Record<WeaponType, CombatCinematicProjectileVisual>;

export function getCombatCinematicProjectileVisual(
  weapon: WeaponType | "enemy",
): CombatCinematicProjectileVisual {
  return weapon === "enemy" ? "enemy" : PROJECTILE_VISUALS[weapon];
}

export function getCombatCinematicProjectileReadout(
  outcome: CombatProjectileOutcome,
  shieldDamage: number,
  hullDamage: number,
): CombatCinematicProjectileReadout {
  const result = { shieldDamage, hullDamage };

  switch (outcome) {
    case "shield":
      return { status: "shield", ...result };
    case "hull":
      return { status: "hull", ...result };
    case "shield_and_hull":
      return { status: "mixed", ...result };
    case "piercing":
      return { status: "piercing", ...result };
    case "miss":
      return { status: "miss", ...result };
    case "intercepted":
      return { status: "intercepted", ...result };
    case "absorbed":
      return { status: "absorbed", ...result };
    case "blocked":
      return { status: "blocked", ...result };
  }
}
