import type { SoundId } from "@/sounds";
import type {
  CombatCinematicEvent,
  CombatProjectileEvent,
} from "@/game/types/combatCinematics";
import type { WeaponType } from "@/game/types";

const WEAPON_SOUND_IDS: Record<WeaponType, SoundId> = {
  kinetic: "combat_kinetic",
  laser: "combat_laser",
  missile: "combat_missile",
  plasma: "combat_plasma",
  drones: "combat_drones",
  antimatter: "combat_antimatter",
  siege_torpedo: "combat_missile",
  quantum_torpedo: "combat_quantum_torpedo",
  ion_cannon: "combat_ion_cannon",
};

export interface CombatCinematicEventSounds {
  /** Выстрел — в начале события. */
  launch: SoundId | null;
  /** Попадание/промах — в момент контакта. */
  impact: SoundId | null;
  /** Второй слой на контакте: крит, пробой щита. */
  accent: SoundId | null;
}

const SILENT: CombatCinematicEventSounds = {
  launch: null,
  impact: null,
  accent: null,
};

function getProjectileImpactSound(
  outcome: CombatProjectileEvent["outcome"],
): SoundId {
  switch (outcome) {
    case "miss":
    case "blocked":
      return "combat_miss";
    // Снаряд разлетелся на полпути — это не удар по корпусу.
    case "intercepted":
      return "combat_shield_break";
    case "shield":
    case "absorbed":
      return "combat_shield_hit";
    default:
      return "combat_hull_hit";
  }
}

/**
 * Звук события боя. Раньше он игрался в момент расчёта, из-за чего весь залп
 * звучал разом ещё до анимации — теперь его дёргает сцена по таймлайну.
 */
export function getCombatCinematicEventSounds(
  event: CombatCinematicEvent,
): CombatCinematicEventSounds {
  if (event.kind === "projectile") {
    return {
      launch: event.weapon === "enemy"
        ? "combat_enemy_fire"
        : WEAPON_SOUND_IDS[event.weapon],
      impact: getProjectileImpactSound(event.outcome),
      accent: event.isCrit ? "combat_critical" : null,
    };
  }

  if (event.kind === "vessel_destroyed") {
    return {
      launch: null,
      impact: event.side === "enemy"
        ? "combat_enemy_destroyed"
        : "combat_player_destroyed",
      accent: null,
    };
  }

  if (event.kind === "module_destroyed") {
    return { launch: null, impact: "combat_shield_break", accent: null };
  }

  if (event.kind === "damage") {
    return {
      launch: null,
      impact: event.hullDamage > 0 ? "combat_hull_hit" : "combat_shield_hit",
      accent: null,
    };
  }

  if (event.kind === "reflection") {
    return { launch: "combat_enemy_fire", impact: "combat_shield_hit", accent: null };
  }

  if (event.kind === "shield_restore") {
    return { launch: null, impact: "combat_shield_hit", accent: null };
  }

  if (event.kind === "boss_ability") {
    return { launch: "combat_critical", impact: null, accent: null };
  }

  return SILENT;
}
