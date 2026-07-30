import type {
  CombatCinematicEvent,
  CombatCinematicHealSource,
  CombatCinematicSide,
  CombatCinematicSnapshot,
  CombatProjectileEvent,
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
  weaponCounts: WeaponCounts;
  missedShots: WeaponCounts;
  missileInterceptedCount: number;
  shieldDamage: number;
  hullDamage: number;
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

function distributeDamage(
  totalDamage: number,
  recipients: CombatProjectileEvent[],
  field: "shieldDamage" | "hullDamage",
): void {
  const totalHundredths = Math.round(totalDamage * 100);
  const baseShare = Math.floor(totalHundredths / recipients.length);
  const remainder = totalHundredths % recipients.length;

  for (let index = 0; index < recipients.length; index += 1) {
    recipients[index][field] += (baseShare + (index < remainder ? 1 : 0)) / 100;
  }
}

/**
 * Turns the current aggregate combat result into a stable visual sequence.
 * Exact per-shot amounts are not retained by the existing resolver, so the
 * aggregate is distributed across the hits that can visually receive it.
 */
export function buildVolleyEvents(
  input: BuildVolleyEventsInput,
): CombatProjectileEvent[] {
  requireNonNegativeInteger(input.missileInterceptedCount, "missileInterceptedCount");
  requireNonNegativeNumber(input.shieldDamage, "shieldDamage");
  requireNonNegativeNumber(input.hullDamage, "hullDamage");

  const events: CombatProjectileEvent[] = [];
  const hits: CombatProjectileEvent[] = [];

  for (const weapon of WEAPON_ORDER) {
    const count = input.weaponCounts[weapon];
    const missed = input.missedShots[weapon];
    const intercepted = weapon === "missile" ? input.missileInterceptedCount : 0;

    requireNonNegativeInteger(count, `${weapon} count`);
    requireNonNegativeInteger(missed, `${weapon} missedShots`);
    if (missed + intercepted > count) {
      throw new RangeError(`${weapon} misses and interceptions exceed fired shots`);
    }

    const hitCount = count - missed - intercepted;
    for (let index = 0; index < hitCount; index += 1) {
      const event: CombatProjectileEvent = {
        kind: "projectile",
        from: input.from,
        to: input.to,
        weapon,
        outcome: "hull",
        shieldDamage: 0,
        hullDamage: 0,
        isCrit: input.isCrit,
        ...(input.targetModuleId === undefined
          ? {}
          : { targetModuleId: input.targetModuleId }),
      };
      events.push(event);
      hits.push(event);
    }

    for (let index = 0; index < intercepted; index += 1) {
      events.push({
        kind: "projectile",
        from: input.from,
        to: input.to,
        weapon,
        outcome: "intercepted",
        shieldDamage: 0,
        hullDamage: 0,
        isCrit: false,
        ...(input.targetModuleId === undefined
          ? {}
          : { targetModuleId: input.targetModuleId }),
      });
    }

    for (let index = 0; index < missed; index += 1) {
      events.push({
        kind: "projectile",
        from: input.from,
        to: input.to,
        weapon,
        outcome: "miss",
        shieldDamage: 0,
        hullDamage: 0,
        isCrit: false,
        ...(input.targetModuleId === undefined
          ? {}
          : { targetModuleId: input.targetModuleId }),
      });
    }
  }

  const shieldRecipients = hits.filter((event) => event.weapon !== "quantum_torpedo");
  if (input.shieldDamage > 0) {
    if (shieldRecipients.length === 0) {
      throw new RangeError("shield damage requires a non-quantum projectile hit");
    }
    distributeDamage(input.shieldDamage, shieldRecipients, "shieldDamage");
  }

  if (input.hullDamage > 0) {
    if (hits.length === 0) {
      throw new RangeError("hull damage requires a projectile hit");
    }
    distributeDamage(input.hullDamage, hits, "hullDamage");
  }

  for (const event of hits) {
    updateOutcome(event);
  }

  return events;
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
