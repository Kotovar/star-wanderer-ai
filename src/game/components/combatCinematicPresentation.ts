import type { WeaponType } from "@/game/types";
import type {
  CombatCinematicEvent,
  CombatCinematicSide,
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

export type CombatCinematicImpactSignature =
  | "scorch"
  | "shrapnel"
  | "blast"
  | "swarm"
  | "distort"
  | "arc";

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
  siege_torpedo: "rocket",
  quantum_torpedo: "phase",
  ion_cannon: "arc",
} as const satisfies Record<WeaponType, CombatCinematicProjectileVisual>;

const IMPACT_SIGNATURES: Record<
  CombatCinematicProjectileVisual,
  CombatCinematicImpactSignature
> = {
  beam: "scorch",
  tracer: "shrapnel",
  rocket: "blast",
  plasma: "blast",
  swarm: "swarm",
  orbit: "distort",
  phase: "distort",
  arc: "arc",
  enemy: "blast",
};

/**
 * Орудия врага — это модули, а не `WeaponType`. Тип модуля задаёт визуал
 * выстрела; всё незнакомое падает в базовый вражеский болт, поэтому новые
 * орудия можно добавлять в данные, ничего здесь не трогая.
 */
const ENEMY_WEAPON_VISUALS: Record<string, CombatCinematicProjectileVisual> = {
  missile_launcher: "rocket",
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
  "missile_launcher",
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

export function getCombatCinematicImpactSignature(
  visual: CombatCinematicProjectileVisual,
): CombatCinematicImpactSignature {
  return IMPACT_SIGNATURES[visual];
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

/**
 * Активное событие сцены глазами presentation-слоя: `impact` — прогресс, на
 * котором удар уже виден. Canvas считает его сам (у него живут константы
 * перехвата и промаха), а свет и импульс берут готовое число.
 */
export interface CombatCinematicActiveEvent {
  event: CombatCinematicEvent;
  progress: number;
  impact: number;
}

export interface CombatCinematicSceneFlash {
  /** Индекс события в переданном списке: цвет вспышки canvas берёт у него же. */
  index: number;
  alpha: number;
}

export interface CombatCinematicImpulse {
  x: number;
  y: number;
}

function clampUnit(value: number): number {
  return Math.min(1, Math.max(0, value));
}

/** Доля события, прошедшая после удара. */
function afterImpact(progress: number, impact: number): number {
  if (progress < impact) return -1;
  return impact >= 1 ? 1 : clampUnit((progress - impact) / (1 - impact));
}

/** Яркость вспышки в пике: чем больше событие, тем сильнее оно освещает сцену. */
function getFlashPeak(event: CombatCinematicEvent): number {
  switch (event.kind) {
    case "vessel_destroyed":
      return 0.5;
    case "module_destroyed":
      return 0.24;
    case "boss_ability":
      return event.effect === "aoe_damage" ? 0.2 : 0.12;
    case "damage":
      return event.hullDamage > 0 ? 0.12 : 0.05;
    case "reflection":
      return event.hullDamage > 0 ? 0.1 : 0.05;
    case "projectile":
      // Промах, перехват и блок не долетают до корпуса — сцену им освещать нечем.
      if (
        event.outcome === "miss" ||
        event.outcome === "intercepted" ||
        event.outcome === "blocked"
      ) return 0;
      if (event.hullDamage > 0) return event.isCrit ? 0.26 : 0.13;
      return 0.05;
    default:
      return 0;
  }
}

/**
 * Свет от самого сильного из идущих событий. Как и тряска, берётся максимум,
 * а не сумма: залп внахлёст иначе держал бы экран засвеченным.
 */
export function getCombatCinematicSceneFlash(
  active: readonly CombatCinematicActiveEvent[],
): CombatCinematicSceneFlash | null {
  let strongest: CombatCinematicSceneFlash | null = null;

  for (let index = 0; index < active.length; index += 1) {
    const item = active[index];
    const after = afterImpact(item.progress, item.impact);
    if (after < 0) continue;
    const alpha = getFlashPeak(item.event) * (1 - after) ** 1.6;
    if (alpha <= 0.004) continue;
    if (strongest === null || alpha > strongest.alpha) strongest = { index, alpha };
  }

  return strongest;
}

/** Насколько далеко корпус уезжает назад при выстреле. */
const RECOIL_WINDOW = 0.16;
const RECOIL_DISTANCE = 7;
const EVADE_DISTANCE = 10;
const MAX_IMPULSE = 14;

/**
 * Смещение корпуса за кадр: отдача на выстреле, толчок от попадания и дрожь
 * при потере модуля. Одно число на сторону — canvas двигает корабль целиком,
 * вместе с модулями, щитом и полосами.
 */
export function getCombatCinematicShipImpulse(
  active: readonly CombatCinematicActiveEvent[],
  side: CombatCinematicSide,
): CombatCinematicImpulse {
  const facing = side === "player" ? 1 : -1;
  let x = 0;
  let y = 0;

  for (const { event, progress, impact } of active) {
    if (event.kind === "projectile") {
      if (event.from === side && progress < RECOIL_WINDOW) {
        x -= facing * RECOIL_DISTANCE * Math.sin((progress / RECOIL_WINDOW) * Math.PI);
      }
      if (event.to === side && event.isEvasion) {
        y += (side === "player" ? 1 : -1) * EVADE_DISTANCE * Math.sin(progress * Math.PI);
        continue;
      }
      if (event.to !== side) continue;
      const after = afterImpact(progress, impact);
      if (after < 0) continue;
      if (event.outcome === "miss" || event.outcome === "intercepted") continue;
      const power = event.hullDamage > 0 ? (event.isCrit ? 12 : 7) : 3.5;
      const decay = (1 - after) ** 2;
      // Толчок идёт по направлению полёта снаряда, а не «от себя».
      x += (event.from === "player" ? 1 : -1) * power * decay;
      y += Math.sin(after * Math.PI * 3) * power * 0.3 * decay;
      continue;
    }

    if (event.kind === "damage" && event.side === side) {
      const after = afterImpact(progress, impact);
      if (after >= 0) y += Math.sin(after * Math.PI * 4) * 4 * (1 - after) ** 2;
      continue;
    }

    if (
      (event.kind === "module_destroyed" || event.kind === "vessel_destroyed") &&
      event.side === side
    ) {
      const power = event.kind === "vessel_destroyed" ? 9 : 5;
      y += Math.sin(progress * Math.PI * 7) * power * (1 - progress) ** 2;
      x -= facing * power * 0.4 * (1 - progress) ** 2;
    }
  }

  return {
    x: Math.max(-MAX_IMPULSE, Math.min(MAX_IMPULSE, x)),
    y: Math.max(-MAX_IMPULSE, Math.min(MAX_IMPULSE, y)),
  };
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
