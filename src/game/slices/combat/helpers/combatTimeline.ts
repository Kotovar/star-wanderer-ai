import type {
  CombatCinematicEvent,
  CombatCinematicHealSource,
  CombatCinematicSide,
  CombatCinematicSnapshot,
  CombatProjectileEvent,
  CombatProjectileResolution,
  CombatTurnTimeline,
} from "../../../types/combatCinematics";
import type { GameState } from "../../../types/game";
import type { WeaponCounts, WeaponType } from "../../../types/modules";
import { DRONE_MAX_STACKS } from "../../../constants/combat.ts";
import { applyCombatCinematicEvent } from "./combatCinematicPlayback.ts";

/**
 * Порядок ведения огня: сначала оружие, снимающее щиты (по убыванию множителя
 * по щитам), затем корпусное. Тот же порядок, что и в резолве урона, — иначе
 * анимация показывает не ту очерёдность, что реально отработала.
 */
const WEAPON_ORDER: WeaponType[] = [
  "ion_cannon",
  "antimatter",
  "plasma",
  "laser",
  "kinetic",
  "drones",
  "missile",
  "quantum_torpedo",
];

export interface BuildVolleyEventsInput {
  from: CombatCinematicSide;
  to: CombatCinematicSide;
  projectiles: readonly CombatProjectileResolution[];
  isCrit: boolean;
  targetModuleId?: number;
  /** Модуль-источник: откуда визуально ушёл снаряд. */
  sourceModuleId?: number;
  /** Палуба-источник: снаряды одного залпа бьют очередью, между залпами пауза. */
  volleyId?: number;
  /** Стаки дронов перед залпом — рой рисуется гуще после каждого попадания. */
  droneStacks?: number;
  targetHullBeforeVolley?: number;
}

export interface CombatTimelineCollector {
  push: (...events: CombatCinematicEvent[]) => void;
  finish: () => CombatTurnTimeline;
}

export function appendCombatSnapshotDeltaEvents(
  collector: CombatTimelineCollector,
  before: CombatCinematicSnapshot,
  after: CombatCinematicSnapshot,
  source: CombatCinematicHealSource,
): void {
  for (const side of ["player", "enemy"] as const) {
    const previousModules = new Map(
      before[side].modules.map((module) => [module.id, module]),
    );

    for (const currentModule of after[side].modules) {
      const previous = previousModules.get(currentModule.id);
      if (!previous) continue;

      if (previous.health > 0 && currentModule.health <= 0) {
        collector.push({ kind: "module_destroyed", side, moduleId: currentModule.id });
      }
      if (currentModule.health > previous.health) {
        collector.push({
          kind: "heal",
          side,
          amount: currentModule.health - previous.health,
          moduleIds: [currentModule.id],
          source,
        });
      }
    }

    const restoredShields = after[side].shields - before[side].shields;
    if (restoredShields > 0) {
      collector.push({
        kind: "shield_restore",
        side,
        amount: restoredShields,
        source: source === "regen" ? "regen" : "restore",
      });
    }
  }
}

/**
 * Emits the damage portion of a state transition for effects that mutate the
 * combat state outside the ordinary projectile resolver (boss auras/skills).
 */
export function appendCombatSnapshotDamageEvents(
  collector: CombatTimelineCollector,
  before: CombatCinematicSnapshot,
  after: CombatCinematicSnapshot,
): void {
  for (const side of ["player", "enemy"] as const) {
    let remainingShieldDamage = Math.max(
      0,
      before[side].shields - after[side].shields,
    );
    const previousModules = new Map(
      before[side].modules.map((module) => [module.id, module]),
    );

    for (const currentModule of after[side].modules) {
      const previous = previousModules.get(currentModule.id);
      if (!previous) continue;
      const hullDamage = Math.max(0, previous.health - currentModule.health);
      if (hullDamage <= 0) continue;
      collector.push({
        kind: "damage",
        side,
        shieldDamage: remainingShieldDamage,
        hullDamage,
        moduleId: currentModule.id,
      });
      remainingShieldDamage = 0;
    }

    if (remainingShieldDamage > 0) {
      collector.push({
        kind: "damage",
        side,
        shieldDamage: remainingShieldDamage,
        hullDamage: 0,
      });
    }
  }
}

/** Adds only state changes not already represented by a primary hit event. */
/**
 * Дописывает урон, который атака нанесла ПОМИМО своих снарядов.
 *
 * Принимает весь залп, а не один снаряд: если учесть только первый, доли
 * остальных орудий выглядят необъяснённым уроном и превращаются в лишнее
 * событие `damage` — игрок видит удар без анимации выстрела.
 */
export function appendCombatSnapshotSecondaryDamageEvents(
  collector: CombatTimelineCollector,
  before: CombatCinematicSnapshot,
  after: CombatCinematicSnapshot,
  primaryEvents: CombatCinematicEvent | readonly CombatCinematicEvent[],
): void {
  const events = Array.isArray(primaryEvents) ? primaryEvents : [primaryEvents];
  const expectedAfterPrimary = events.reduce(
    (snapshot, event) => applyCombatCinematicEvent(snapshot, event),
    before,
  );
  appendCombatSnapshotDamageEvents(collector, expectedAfterPrimary, after);
  appendCombatSnapshotDeltaEvents(collector, expectedAfterPrimary, after, "repair");
}

export function createCombatCinematicSnapshot(
  state: Pick<GameState, "ship" | "currentCombat">,
): CombatCinematicSnapshot | null {
  const combat = state.currentCombat;
  if (!combat) return null;

  const enemyKind = combat.enemy.isBoss
    ? "boss"
    : combat.enemy.modules.some((module) => module.isBiological)
      ? "creature"
      : "enemy_ship";

  return {
    player: {
      kind: "player_ship",
      name: "player",
      shields: state.ship.shields,
      maxShields: state.ship.maxShields,
      modules: state.ship.modules.map((module) => ({
        id: module.id,
        ...(module.name ? { name: module.name } : {}),
        health: module.health,
        maxHealth: module.maxHealth,
      })),
    },
    enemy: {
      kind: enemyKind,
      name: combat.enemy.name,
      shields: combat.enemy.shields,
      maxShields: combat.enemy.maxShields,
      modules: combat.enemy.modules.map((module) => ({
        id: module.id,
        ...(module.name ? { name: module.name } : {}),
        health: module.health,
        maxHealth: module.maxHealth ?? module.health,
      })),
      ...(combat.enemy.enemyType
        ? { enemyType: combat.enemy.enemyType }
        : {}),
      ...(combat.enemy.spaceMonsterType
        ? { spaceMonsterType: combat.enemy.spaceMonsterType }
        : {}),
      ...(combat.enemy.bossId ? { bossId: combat.enemy.bossId } : {}),
    },
  };
}

function copySnapshot(snapshot: CombatCinematicSnapshot): CombatCinematicSnapshot {
  const copyVessel = (vessel: CombatCinematicSnapshot["player"]) => ({
    ...vessel,
    modules: vessel.modules.map((module) => ({ ...module })),
  });

  return {
    player: copyVessel(snapshot.player),
    enemy: copyVessel(snapshot.enemy),
  };
}

function copyEvent(event: CombatCinematicEvent): CombatCinematicEvent {
  if (event.kind === "heal") {
    return { ...event, moduleIds: [...event.moduleIds] };
  }

  return { ...event };
}

function requireNonNegativeNumber(value: number, label: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${label} must be a non-negative number`);
  }
}

function requireNonNegativeInteger(value: number, label: string): void {
  requireNonNegativeNumber(value, label);
  if (!Number.isInteger(value)) {
    throw new RangeError(`${label} must be a non-negative integer`);
  }
}

export function getProjectileOutcome(
  shieldDamage: number,
  hullDamage: number,
): CombatProjectileEvent["outcome"] {
  return shieldDamage > 0 && hullDamage > 0
    ? "shield_and_hull"
    : shieldDamage > 0
      ? "shield"
      : "hull";
}

function updateOutcome(event: CombatProjectileEvent): void {
  event.outcome = getProjectileOutcome(event.shieldDamage, event.hullDamage);
}

export interface VolleyHullSplit {
  /** Shots up to and including the one that empties the target's hull. */
  onTarget: readonly CombatProjectileResolution[];
  /** Shots left over once the target is already a wreck. */
  overkill: readonly CombatProjectileResolution[];
}

/**
 * Splits a volley where its target dies. Everything after that point was aimed
 * at a module that no longer exists, so the caller re-aims it.
 */
export function splitVolleyAtHullDestruction(
  projectiles: readonly CombatProjectileResolution[],
  targetHullBeforeVolley: number,
): VolleyHullSplit {
  requireNonNegativeNumber(targetHullBeforeVolley, "targetHullBeforeVolley");
  if (targetHullBeforeVolley === 0) return { onTarget: [], overkill: projectiles };

  let remainingHull = targetHullBeforeVolley;
  for (let index = 0; index < projectiles.length; index += 1) {
    remainingHull -= projectiles[index].hullDamage;
    if (remainingHull <= 0) {
      return {
        onTarget: projectiles.slice(0, index + 1),
        overkill: projectiles.slice(index + 1),
      };
    }
  }

  return { onTarget: projectiles, overkill: [] };
}

function takeProjectilesThroughHullDestruction(
  projectiles: readonly CombatProjectileResolution[],
  targetHullBeforeVolley: number,
): readonly CombatProjectileResolution[] {
  return splitVolleyAtHullDestruction(projectiles, targetHullBeforeVolley).onTarget;
}

/**
 * Делит уже посчитанный урон между орудиями врага пропорционально их силе.
 * Урон НЕ пересчитывается: броня и уклонение резолвятся один раз на залп, как и
 * раньше, — иначе дробление само по себе ослабило бы врага на `броня × (N−1)`.
 * Метод наибольших остатков, поэтому сумма долей точно равна исходному числу.
 */
export function splitDamageByWeight(
  weights: readonly number[],
  total: number,
): number[] {
  requireNonNegativeNumber(total, "total");
  const positiveWeights = weights.map((weight) => Math.max(0, weight));
  const weightSum = positiveWeights.reduce((sum, weight) => sum + weight, 0);
  if (weightSum <= 0 || total <= 0) return weights.map(() => 0);

  const exact = positiveWeights.map((weight) => (weight / weightSum) * total);
  const shares = exact.map((value) => Math.floor(value));
  let remainder = Math.round(total) - shares.reduce((sum, value) => sum + value, 0);

  const byRemainder = exact
    .map((value, index) => ({ index, fraction: value - Math.floor(value) }))
    .sort((a, b) => b.fraction - a.fraction);
  for (let step = 0; remainder > 0 && step < byRemainder.length; step += 1) {
    shares[byRemainder[step].index] += 1;
    remainder -= 1;
  }

  return shares;
}

interface EnemyVolleyGun {
  id: number;
  type: string;
  damage?: number;
}

/**
 * Превращает уже рассчитанный урон врага в видимые выстрелы его живых орудий.
 * Математика боя не меняется: доли суммируются в исходный урон.
 */
export function buildEnemyVolleyProjectileEvents(
  guns: readonly EnemyVolleyGun[],
  targetModuleId: number,
  shieldDamage: number,
  hullDamage: number,
  isCrit: boolean,
  outcome?: CombatProjectileEvent["outcome"],
): CombatProjectileEvent[] {
  const makeEvent = (
    gun: EnemyVolleyGun | undefined,
    currentShieldDamage: number,
    currentHullDamage: number,
    currentOutcome = outcome,
  ): CombatProjectileEvent => ({
    kind: "projectile",
    from: "enemy",
    to: "player",
    weapon: "enemy",
    targetModuleId,
    outcome: currentOutcome ?? (currentShieldDamage === 0 && currentHullDamage === 0
      ? "blocked"
      : getProjectileOutcome(currentShieldDamage, currentHullDamage)),
    shieldDamage: currentShieldDamage,
    hullDamage: currentHullDamage,
    isCrit,
    ...(gun === undefined ? {} : { enemyWeapon: gun.type, sourceModuleId: gun.id }),
  });

  if (guns.length <= 1) return [makeEvent(guns[0], shieldDamage, hullDamage)];

  const weights = guns.map((gun) => gun.damage ?? 0);
  const shieldShares = splitDamageByWeight(weights, shieldDamage);
  const hullShares = splitDamageByWeight(weights, hullDamage);
  const events: CombatProjectileEvent[] = [];

  for (let index = 0; index < guns.length; index += 1) {
    const shotShield = shieldShares[index];
    const shotHull = hullShares[index];
    if (shotShield === 0 && shotHull === 0) continue;
    events.push(makeEvent(
      guns[index],
      shotShield,
      shotHull,
      outcome === "piercing" && shotShield > 0 && shotHull > 0 ? "piercing" : undefined,
    ));
  }

  return events.length > 0 ? events : [makeEvent(guns[0], shieldDamage, hullDamage)];
}

export function createMissProjectileResolutions(
  weaponCounts: WeaponCounts,
): CombatProjectileResolution[] {
  const projectiles: CombatProjectileResolution[] = [];

  for (const weapon of WEAPON_ORDER) {
    const count = weaponCounts[weapon];
    requireNonNegativeInteger(count, `${weapon} count`);
    for (let index = 0; index < count; index += 1) {
      projectiles.push({
        weapon,
        outcome: "miss",
        shieldDamage: 0,
        hullDamage: 0,
      });
    }
  }

  return projectiles;
}

/**
 * Armor is resolved once for the whole bay. Keep that total exact while only
 * assigning the remaining hull damage to projectiles that actually reached it.
 */
export function finalizeProjectileHullDamage(
  projectiles: readonly CombatProjectileResolution[],
  finalHullDamage: number,
): CombatProjectileResolution[] {
  requireNonNegativeNumber(finalHullDamage, "finalHullDamage");
  const rawHullDamage = projectiles.reduce(
    (total, projectile) => total + projectile.hullDamage,
    0,
  );
  requireNonNegativeNumber(rawHullDamage, "rawHullDamage");

  if (rawHullDamage === 0) {
    if (finalHullDamage > 0) {
      throw new RangeError("final hull damage requires a projectile that reached the hull");
    }
    return projectiles.map((projectile) => ({ ...projectile }));
  }

  const ratio = finalHullDamage / rawHullDamage;
  return projectiles.map((projectile) => {
    if (projectile.hullDamage === 0) return { ...projectile };
    const hullDamage = projectile.hullDamage * ratio;
    const outcome = projectile.outcome === "piercing"
      ? "piercing"
      : getProjectileOutcome(projectile.shieldDamage, hullDamage);
    return { ...projectile, hullDamage, outcome };
  });
}

/** Turns already-resolved shots into their visual events without re-simulating damage. */
export function buildVolleyEvents(
  input: BuildVolleyEventsInput,
): CombatProjectileEvent[] {
  const projectiles = input.targetHullBeforeVolley === undefined
    ? input.projectiles
    : takeProjectilesThroughHullDestruction(
      input.projectiles,
      input.targetHullBeforeVolley,
    );
  let droneStacks = input.droneStacks;

  return projectiles.map((projectile) => {
    requireNonNegativeNumber(projectile.shieldDamage, "projectile shieldDamage");
    requireNonNegativeNumber(projectile.hullDamage, "projectile hullDamage");
    const isNonDamageOutcome =
      projectile.outcome === "miss" ||
      projectile.outcome === "intercepted" ||
      projectile.outcome === "absorbed" ||
      projectile.outcome === "blocked";
    if (!isNonDamageOutcome && projectile.shieldDamage + projectile.hullDamage <= 0) {
      throw new RangeError("a projectile hit must have shield or hull damage");
    }
    if (projectile.weapon === "drones" && droneStacks !== undefined && !isNonDamageOutcome) {
      droneStacks = Math.min(DRONE_MAX_STACKS, droneStacks + 1);
    }

    const event: CombatProjectileEvent = {
      kind: "projectile",
      from: input.from,
      to: input.to,
      ...projectile,
      isCrit: input.isCrit && !isNonDamageOutcome,
      ...(input.targetModuleId === undefined
        ? {}
        : { targetModuleId: input.targetModuleId }),
      ...(input.sourceModuleId === undefined
        ? {}
        : { sourceModuleId: input.sourceModuleId }),
      ...(input.volleyId === undefined ? {} : { volleyId: input.volleyId }),
      ...(projectile.weapon === "drones" && droneStacks !== undefined
        ? { droneStacks }
        : {}),
    };
    if (!isNonDamageOutcome && projectile.outcome !== "piercing") {
      updateOutcome(event);
    }
    return event;
  });
}

export function createCombatTimelineCollector(
  initial: CombatCinematicSnapshot,
): CombatTimelineCollector {
  const initialSnapshot = copySnapshot(initial);
  const events: CombatCinematicEvent[] = [];

  return {
    push: (...newEvents) => events.push(...newEvents.map(copyEvent)),
    finish: () => ({
      initial: copySnapshot(initialSnapshot),
      events: events.map(copyEvent),
    }),
  };
}
