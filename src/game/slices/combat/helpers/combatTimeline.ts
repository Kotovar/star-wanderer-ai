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

const WEAPON_ORDER: WeaponType[] = [
  "laser",
  "kinetic",
  "missile",
  "plasma",
  "drones",
  "antimatter",
  "quantum_torpedo",
  "ion_cannon",
];

export interface BuildVolleyEventsInput {
  from: CombatCinematicSide;
  to: CombatCinematicSide;
  projectiles: readonly CombatProjectileResolution[];
  isCrit: boolean;
  targetModuleId?: number;
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
        health: module.health,
        maxHealth: module.maxHealth ?? module.health,
      })),
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
  return input.projectiles.map((projectile) => {
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

    const event: CombatProjectileEvent = {
      kind: "projectile",
      from: input.from,
      to: input.to,
      ...projectile,
      isCrit: input.isCrit && !isNonDamageOutcome,
      ...(input.targetModuleId === undefined
        ? {}
        : { targetModuleId: input.targetModuleId }),
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
