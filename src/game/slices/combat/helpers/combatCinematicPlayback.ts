import type {
  CombatCinematicEvent,
  CombatCinematicSnapshot,
  CombatProjectileEvent,
} from "../../../types/combatCinematics";

const DIRECT_PROJECTILE_IMPACT_PROGRESS = 0.62;
const SHIELD_BREACH_PROGRESS = 0.68;
const HULL_AFTER_SHIELD_BREACH_PROGRESS = 0.76;

export function getCombatCinematicEventDuration(
  event: CombatCinematicEvent,
): number {
  switch (event.kind) {
    case "reflection":
      return 900;
    case "module_destroyed":
      return 620;
    case "vessel_destroyed":
      return 720;
    case "boss_ability":
      return 720;
    case "heal":
    case "shield_restore":
      return 460;
    case "turn_skipped":
      return 420;
    case "projectile":
      return 1500;
  }
}

function copySnapshot(snapshot: CombatCinematicSnapshot): CombatCinematicSnapshot {
  const copyVessel = (vessel: CombatCinematicSnapshot["player"]) => ({
    ...vessel,
    modules: vessel.modules.map((currentModule) => ({ ...currentModule })),
  });

  return {
    player: copyVessel(snapshot.player),
    enemy: copyVessel(snapshot.enemy),
  };
}

export function getCombatCinematicProjectileContactProgress(
  event: CombatProjectileEvent,
): { shield: number; hull: number } {
  if (event.outcome === "shield_and_hull") {
    return {
      shield: SHIELD_BREACH_PROGRESS,
      hull: HULL_AFTER_SHIELD_BREACH_PROGRESS,
    };
  }

  return { shield: DIRECT_PROJECTILE_IMPACT_PROGRESS, hull: DIRECT_PROJECTILE_IMPACT_PROGRESS };
}

export function getCombatCinematicSnapshotAtProgress(
  snapshot: CombatCinematicSnapshot,
  event: CombatCinematicEvent,
  progress: number,
): CombatCinematicSnapshot {
  if (event.kind === "projectile") {
    if (
      event.outcome === "miss" ||
      event.outcome === "intercepted" ||
      event.outcome === "absorbed"
    ) return snapshot;

    const { shield: shieldContact, hull: hullContact } =
      getCombatCinematicProjectileContactProgress(event);
    const shieldDamage = progress >= shieldContact ? event.shieldDamage : 0;
    const hullDamage = progress >= hullContact ? event.hullDamage : 0;

    if (shieldDamage === 0 && hullDamage === 0) return snapshot;
    return applyCombatCinematicEvent(snapshot, { ...event, shieldDamage, hullDamage });
  }

  if (event.kind === "reflection" && progress >= 0.8) {
    return applyCombatCinematicEvent(snapshot, event);
  }

  if (event.kind === "vessel_destroyed" && progress >= 0.15) {
    return applyCombatCinematicEvent(snapshot, event);
  }

  return snapshot;
}

export function applyCombatCinematicEvent(
  snapshot: CombatCinematicSnapshot,
  event: CombatCinematicEvent,
): CombatCinematicSnapshot {
  const next = copySnapshot(snapshot);

  if (event.kind === "projectile") {
    if (
      event.outcome === "miss" ||
      event.outcome === "intercepted" ||
      event.outcome === "absorbed"
    ) return next;
    const target = next[event.to];
    target.shields = Math.max(0, target.shields - event.shieldDamage);
    if (event.targetModuleId !== undefined) {
      const targetModule = target.modules.find(
        (currentModule) => currentModule.id === event.targetModuleId,
      );
      if (targetModule) {
        targetModule.health = Math.max(0, targetModule.health - event.hullDamage);
      }
    }
    return next;
  }

  if (event.kind === "reflection") {
    const target = next[event.attacker];
    target.shields = Math.max(0, target.shields - event.shieldDamage);
    const targetModule = target.modules.find(
      (currentModule) => currentModule.id === event.targetModuleId,
    );
    if (targetModule) {
      targetModule.health = Math.max(0, targetModule.health - event.hullDamage);
    }
    return next;
  }

  if (event.kind === "heal") {
    const target = next[event.side];
    for (const moduleId of event.moduleIds) {
      const targetModule = target.modules.find(
        (currentModule) => currentModule.id === moduleId,
      );
      if (targetModule) {
        targetModule.health = Math.min(
          targetModule.maxHealth,
          targetModule.health + event.amount,
        );
      }
    }
    return next;
  }

  if (event.kind === "shield_restore") {
    const target = next[event.side];
    target.shields = Math.min(target.maxShields, target.shields + event.amount);
    return next;
  }

  if (event.kind === "module_destroyed") {
    const targetModule = next[event.side].modules.find(
      (currentModule) => currentModule.id === event.moduleId,
    );
    if (targetModule) targetModule.health = 0;
  }

  if (event.kind === "vessel_destroyed") {
    const target = next[event.side];
    target.shields = 0;
    target.modules.forEach((currentModule) => {
      currentModule.health = 0;
    });
  }

  return next;
}
