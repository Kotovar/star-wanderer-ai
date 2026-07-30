import type { BossAbilityEffectType } from "./bosses";
import type { WeaponType } from "./modules";

export type CombatCinematicSide = "player" | "enemy";
export type CombatVesselKind = "player_ship" | "enemy_ship" | "boss" | "creature";
export type CombatProjectileOutcome =
  | "miss"
  | "intercepted"
  | "absorbed"
  | "shield"
  | "hull"
  | "shield_and_hull";
export type CombatCinematicHealSource = "regen" | "repair" | "lifesteal";

export interface CombatCinematicModuleSnapshot {
  id: number;
  health: number;
  maxHealth: number;
}

export interface CombatCinematicVesselSnapshot {
  kind: CombatVesselKind;
  name: string;
  shields: number;
  maxShields: number;
  modules: CombatCinematicModuleSnapshot[];
}

export interface CombatCinematicSnapshot {
  player: CombatCinematicVesselSnapshot;
  enemy: CombatCinematicVesselSnapshot;
}

export interface CombatProjectileEvent {
  kind: "projectile";
  from: CombatCinematicSide;
  to: CombatCinematicSide;
  weapon: WeaponType | "enemy";
  outcome: CombatProjectileOutcome;
  shieldDamage: number;
  hullDamage: number;
  isCrit: boolean;
  targetModuleId?: number;
}

export type CombatCinematicEvent =
  | CombatProjectileEvent
  | { kind: "turn_skipped"; side: CombatCinematicSide }
  | {
      kind: "reflection";
      attacker: CombatCinematicSide;
      defender: CombatCinematicSide;
      targetModuleId: number;
      shieldDamage: number;
      hullDamage: number;
    }
  | {
      kind: "heal";
      side: CombatCinematicSide;
      amount: number;
      moduleIds: number[];
      source: CombatCinematicHealSource;
    }
  | {
      kind: "shield_restore";
      side: CombatCinematicSide;
      amount: number;
      source: "regen" | "restore";
  }
  | { kind: "module_destroyed"; side: CombatCinematicSide; moduleId: number }
  | { kind: "vessel_destroyed"; side: CombatCinematicSide }
  | { kind: "boss_ability"; effect: BossAbilityEffectType; name: string };

export interface CombatTurnTimeline {
  initial: CombatCinematicSnapshot;
  events: CombatCinematicEvent[];
}
