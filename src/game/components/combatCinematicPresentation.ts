import type { WeaponType } from "@/game/types";
import type {
  CombatProjectileOutcome,
  CombatTurnTimeline,
} from "@/game/types/combatCinematics";

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

export interface CombatCinematicVolleySummary {
  playerShieldDamage: number;
  playerHullDamage: number;
  enemyShieldDamage: number;
  enemyHullDamage: number;
  criticalHits: number;
  destroyedEnemyModuleIds: number[];
  destroyedPlayerModuleIds: number[];
  droneStacks: number;
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

/**
 * Орудия врага — это модули, а не `WeaponType`. Тип модуля задаёт визуал
 * выстрела; всё незнакомое падает в базовый вражеский болт, поэтому новые
 * орудия можно добавлять в данные, ничего здесь не трогая.
 */
const ENEMY_WEAPON_VISUALS: Record<string, CombatCinematicProjectileVisual> = {
  plasma_cannon: "plasma",
  radiation_core: "plasma",
  flare_launcher: "rocket",
  nano_swarm: "swarm",
  energy_drain: "arc",
  shield_drain: "arc",
  disruption_field: "arc",
  link_breaker: "arc",
  disintegrate_beam: "beam",
  ice_beam: "beam",
  annihilation_beam: "beam",
  void_cannon: "orbit",
  entropy_cannon: "orbit",
  void_anchor: "orbit",
  void_embrace: "orbit",
  absolute_zero: "phase",
  temporal_cannon: "phase",
  paradox_engine: "phase",
  reality_tear: "phase",
  grapple_arm: "tracer",
  prophecy_lance: "tracer",
  severance_array: "arc",
  chronofracture_battery: "phase",
  oblivion_spire: "orbit",
};

/**
 * Орудия врага, у которых есть собственное имя в локалях
 * (`combat_cinematics.enemy_weapons.*`). Всё остальное подписывается общим
 * «орудие врага», поэтому новый ствол в данных ничего не ломает — он просто
 * не назван, пока ключ не добавлен.
 */
export const COMBAT_CINEMATIC_ENEMY_WEAPON_KEYS: readonly string[] = [
  "weapon",
  "plasma_cannon",
  "flare_launcher",
  "radiation_core",
  "energy_drain",
  "shield_drain",
  "disintegrate_beam",
  "nano_swarm",
  "void_cannon",
  "ice_beam",
  "absolute_zero",
  "entropy_cannon",
  "void_anchor",
  "prophecy_lance",
  "link_breaker",
  "severance_array",
  "annihilation_beam",
  "temporal_cannon",
  "chronofracture_battery",
  "paradox_engine",
  "reality_tear",
  "oblivion_spire",
  "void_embrace",
];

const NAMED_ENEMY_WEAPONS = new Set(COMBAT_CINEMATIC_ENEMY_WEAPON_KEYS);

/** Ключ подписи орудия врага — всегда существующий, чтобы t() не вернул сырой ключ. */
export function getCombatCinematicEnemyWeaponKey(enemyWeapon?: string): string {
  return enemyWeapon !== undefined && NAMED_ENEMY_WEAPONS.has(enemyWeapon)
    ? enemyWeapon
    : "enemy";
}

const VISUAL_ICONS: Record<CombatCinematicProjectileVisual, string> = {
  beam: "≡",
  tracer: "▪",
  rocket: "➤",
  plasma: "◉",
  swarm: "⁘",
  orbit: "◍",
  phase: "◈",
  arc: "⚡",
  enemy: "✦",
};

/** Иконка выстрела врага — по семейству визуала, чтобы стволы различались и в тексте. */
export function getCombatCinematicEnemyWeaponIcon(enemyWeapon?: string): string {
  return VISUAL_ICONS[getCombatCinematicProjectileVisual("enemy", enemyWeapon)];
}

export function getCombatCinematicProjectileVisual(
  weapon: WeaponType | "enemy",
  enemyWeapon?: string,
): CombatCinematicProjectileVisual {
  if (weapon !== "enemy") return PROJECTILE_VISUALS[weapon];
  if (enemyWeapon === undefined) return "enemy";
  return ENEMY_WEAPON_VISUALS[enemyWeapon] ?? "enemy";
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

/** Сводка берёт только уже рассчитанный таймлайн и ничего не меняет в бою. */
export function getCombatCinematicVolleySummary(
  timeline: CombatTurnTimeline,
): CombatCinematicVolleySummary {
  const destroyedEnemyModuleIds = new Set<number>();
  const destroyedPlayerModuleIds = new Set<number>();
  const summary: CombatCinematicVolleySummary = {
    playerShieldDamage: 0,
    playerHullDamage: 0,
    enemyShieldDamage: 0,
    enemyHullDamage: 0,
    criticalHits: 0,
    destroyedEnemyModuleIds: [],
    destroyedPlayerModuleIds: [],
    droneStacks: 0,
  };

  const addDamage = (
    side: "player" | "enemy",
    shieldDamage: number,
    hullDamage: number,
  ) => {
    if (side === "player") {
      summary.playerShieldDamage += shieldDamage;
      summary.playerHullDamage += hullDamage;
      return;
    }
    summary.enemyShieldDamage += shieldDamage;
    summary.enemyHullDamage += hullDamage;
  };

  for (const event of timeline.events) {
    if (event.kind === "projectile") {
      addDamage(event.to, event.shieldDamage, event.hullDamage);
      if (event.isCrit) summary.criticalHits += 1;
      if (event.weapon === "drones" && event.droneStacks !== undefined) {
        summary.droneStacks = Math.max(summary.droneStacks, event.droneStacks);
      }
      continue;
    }
    if (event.kind === "damage") {
      addDamage(event.side, event.shieldDamage, event.hullDamage);
      continue;
    }
    if (event.kind === "reflection") {
      addDamage(event.attacker, event.shieldDamage, event.hullDamage);
      continue;
    }
    if (event.kind === "module_destroyed") {
      const destroyed = event.side === "enemy"
        ? destroyedEnemyModuleIds
        : destroyedPlayerModuleIds;
      destroyed.add(event.moduleId);
    }
  }

  return {
    ...summary,
    destroyedEnemyModuleIds: [...destroyedEnemyModuleIds],
    destroyedPlayerModuleIds: [...destroyedPlayerModuleIds],
  };
}
