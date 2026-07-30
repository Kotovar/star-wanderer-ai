import type {
  CombatCinematicEvent,
  CombatCinematicSnapshot,
} from "../../../types/combatCinematics";

export function getCombatCinematicEventDuration(
  event: CombatCinematicEvent,
): number {
  switch (event.kind) {
    case "reflection":
      return 900;
    case "module_destroyed":
      return 620;
    case "boss_ability":
      return 720;
    case "heal":
    case "shield_restore":
      return 460;
    case "turn_skipped":
      return 420;
    case "projectile":
      return 680;
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

export function applyCombatCinematicEvent(
  snapshot: CombatCinematicSnapshot,
  event: CombatCinematicEvent,
): CombatCinematicSnapshot {
  const next = copySnapshot(snapshot);

  if (event.kind === "projectile") {
    if (event.outcome === "miss" || event.outcome === "intercepted") return next;
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

  return next;
}
