import type { BossAbilityEffectType } from "./bosses";
import type { EnemyShip } from "./enemy";
import type { SpaceMonsterType } from "./locations/locations";
import type { WeaponType } from "./modules";

export type CombatCinematicSide = "player" | "enemy";
export type CombatVesselKind = "player_ship" | "enemy_ship" | "boss" | "creature";
export type CombatProjectileOutcome =
  | "miss"
  | "intercepted"
  | "absorbed"
  | "shield"
  | "hull"
  | "shield_and_hull"
  | "piercing"
  | "blocked";
export type CombatCinematicHealSource = "regen" | "repair" | "lifesteal";

export interface CombatCinematicModuleSnapshot {
  id: number;
  name?: string;
  health: number;
  maxHealth: number;
}

export interface CombatCinematicVesselSnapshot {
  kind: CombatVesselKind;
  name: string;
  shields: number;
  maxShields: number;
  modules: CombatCinematicModuleSnapshot[];
  enemyType?: EnemyShip;
  spaceMonsterType?: SpaceMonsterType;
  bossId?: string;
}

export interface CombatCinematicSnapshot {
  player: CombatCinematicVesselSnapshot;
  enemy: CombatCinematicVesselSnapshot;
}

export interface CombatProjectileResolution {
  weapon: WeaponType | "enemy";
  outcome: CombatProjectileOutcome;
  shieldDamage: number;
  hullDamage: number;
  /** Модуль ПВО на стороне цели, который выпустил перехватчик. */
  interceptorModuleId?: number;
}

export interface CombatProjectileEvent extends CombatProjectileResolution {
  kind: "projectile";
  from: CombatCinematicSide;
  to: CombatCinematicSide;
  isCrit: boolean;
  /** Цель уклонилась своим манёвром, а не просто избежала урона другим эффектом. */
  isEvasion?: boolean;
  /** Фазовый сдвиг босса отменил критический множитель этого попадания. */
  isPhaseShift?: boolean;
  targetModuleId?: number;
  /** Модуль-источник: откуда визуально ушёл снаряд. */
  sourceModuleId?: number;
  /**
   * Тип модуля-орудия врага (`plasma_cannon`, `ice_beam`, …). Задаёт визуал
   * выстрела: у врага нет `WeaponType`, но орудия у него разные.
   */
  enemyWeapon?: string;
  /**
   * Из какой оружейной палубы (или залпа врага) ушёл снаряд. Снаряды одного
   * залпа бьют очередью, между залпами сцена держит паузу.
   */
  volleyId?: number | string;
  /**
   * Накопленные стаки дронов на момент выстрела. Рой должен расти на глазах —
   * это единственный бонус боя, который копится молча.
   */
  droneStacks?: number;
}

export type CombatCinematicEvent =
  | CombatProjectileEvent
  | { kind: "turn_skipped"; side: CombatCinematicSide }
  | { kind: "turn_skip_applied"; side: CombatCinematicSide }
  | { kind: "boss_aura"; sourceModuleIds: number[] }
  | { kind: "crew_immortality"; side: CombatCinematicSide; moduleId: number }
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
  | {
      kind: "damage";
      side: CombatCinematicSide;
      shieldDamage: number;
      hullDamage: number;
      moduleId?: number;
    }
  | { kind: "module_destroyed"; side: CombatCinematicSide; moduleId: number }
  | { kind: "vessel_destroyed"; side: CombatCinematicSide }
  | { kind: "boss_ability"; effect: BossAbilityEffectType; name: string };

export interface CombatTurnTimeline {
  initial: CombatCinematicSnapshot;
  events: CombatCinematicEvent[];
}
