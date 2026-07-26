import type { TimedEffectId } from "@/game/effects/timedEffects";
import type {
  BossModuleEffect,
  ResearchResourceType,
  SpaceMonsterType,
  StarType,
} from "@/game/types";

// Every variant fully resolves its effect (full heal, full refuel, guaranteed
// hint) — first contact with one of these beings is meant to feel like a
// singular gift, not a partial top-up.
export type SpaceMonsterFirstContact =
  | {
      type: "reveal_sector";
      descriptionKey: string;
    }
  | {
      type: "heal_crew";
      descriptionKey: string;
    }
  | {
      type: "refuel";
      descriptionKey: string;
    }
  | {
      type: "artifact_hint";
      descriptionKey: string;
    };

/** Bonus units of the monster's own research resource granted on first contact, on top of its unique effect. */
export const FIRST_CONTACT_RESOURCE_BONUS = 2;

export type SpaceMonsterDefinition = {
  nameKey: string;
  descriptionKey: string;
  behaviorKey: string;
  /** Short in-universe legend/rumor about the creature — flavor only, no mechanical effect. */
  loreKey: string;
  icon: string;
  color: string;
  threatBonus: number;
  resonanceEffect: TimedEffectId;
  huntReward: ResearchResourceType;
  huntRewardBase: number;
  firstContact: SpaceMonsterFirstContact;
  /** Signature combat passive on the monster's weapon module — makes hunts feel distinct, not just a tougher pirate. */
  moduleEffect: BossModuleEffect;
};

export const SPACE_MONSTERS: Record<
  SpaceMonsterType,
  SpaceMonsterDefinition
> = {
  void_ray: {
    nameKey: "space_monsters.void_ray.name",
    descriptionKey: "space_monsters.void_ray.description",
    behaviorKey: "space_monsters.void_ray.behavior",
    loreKey: "space_monsters.void_ray.lore",
    icon: "🪼",
    color: "#8b5cf6",
    threatBonus: 1,
    resonanceEffect: "void_ray_pact",
    huntReward: "void_membrane",
    huntRewardBase: 1,
    firstContact: {
      type: "reveal_sector",
      descriptionKey: "space_monsters.void_ray.first_contact",
    },
    moduleEffect: { type: "dodge", value: 15 },
  },
  nebula_manta: {
    nameKey: "space_monsters.nebula_manta.name",
    descriptionKey: "space_monsters.nebula_manta.description",
    behaviorKey: "space_monsters.nebula_manta.behavior",
    loreKey: "space_monsters.nebula_manta.lore",
    icon: "🦋",
    color: "#22d3ee",
    threatBonus: 0,
    resonanceEffect: "nebula_manta_pact",
    huntReward: "alien_biology",
    huntRewardBase: 2,
    firstContact: {
      type: "heal_crew",
      descriptionKey: "space_monsters.nebula_manta.first_contact",
    },
    moduleEffect: { type: "heal_on_damage", value: 20 },
  },
  plasma_leviathan: {
    nameKey: "space_monsters.plasma_leviathan.name",
    descriptionKey: "space_monsters.plasma_leviathan.description",
    behaviorKey: "space_monsters.plasma_leviathan.behavior",
    loreKey: "space_monsters.plasma_leviathan.lore",
    icon: "🐉",
    color: "#fb923c",
    threatBonus: 1,
    resonanceEffect: "plasma_leviathan_pact",
    huntReward: "energy_samples",
    huntRewardBase: 2,
    firstContact: {
      type: "refuel",
      descriptionKey: "space_monsters.plasma_leviathan.first_contact",
    },
    moduleEffect: { type: "damage_aura", value: 5 },
  },
  crystal_hydra: {
    nameKey: "space_monsters.crystal_hydra.name",
    descriptionKey: "space_monsters.crystal_hydra.description",
    behaviorKey: "space_monsters.crystal_hydra.behavior",
    loreKey: "space_monsters.crystal_hydra.lore",
    icon: "💠",
    color: "#c084fc",
    threatBonus: 1,
    resonanceEffect: "crystal_hydra_pact",
    huntReward: "quantum_crystals",
    huntRewardBase: 1,
    firstContact: {
      type: "artifact_hint",
      descriptionKey: "space_monsters.crystal_hydra.first_contact",
    },
    moduleEffect: { type: "regen", value: 10 },
  },
  ember_wisp: {
    nameKey: "space_monsters.ember_wisp.name",
    descriptionKey: "space_monsters.ember_wisp.description",
    behaviorKey: "space_monsters.ember_wisp.behavior",
    loreKey: "space_monsters.ember_wisp.lore",
    icon: "✨",
    color: "#ffcc55",
    threatBonus: 0,
    resonanceEffect: "ember_wisp_pact",
    huntReward: "rare_minerals",
    huntRewardBase: 1,
    firstContact: {
      type: "refuel",
      descriptionKey: "space_monsters.ember_wisp.first_contact",
    },
    moduleEffect: { type: "regen", value: 6 },
  },
  binary_wyrm: {
    nameKey: "space_monsters.binary_wyrm.name",
    descriptionKey: "space_monsters.binary_wyrm.description",
    behaviorKey: "space_monsters.binary_wyrm.behavior",
    loreKey: "space_monsters.binary_wyrm.lore",
    icon: "♊",
    color: "#6c5ce7",
    threatBonus: 1,
    resonanceEffect: "binary_wyrm_pact",
    huntReward: "ancient_data",
    huntRewardBase: 1,
    firstContact: {
      type: "reveal_sector",
      descriptionKey: "space_monsters.binary_wyrm.first_contact",
    },
    moduleEffect: { type: "damage_aura", value: 6 },
  },
};

const STAR_MONSTERS: Partial<Record<StarType, SpaceMonsterType>> = {
  blackhole: "void_ray",
  stellar_remnant: "void_ray",
  brown_dwarf: "nebula_manta",
  variable_star: "nebula_manta",
  blue_giant: "plasma_leviathan",
  red_supergiant: "plasma_leviathan",
  neutron_star: "crystal_hydra",
  white_dwarf: "crystal_hydra",
  red_dwarf: "ember_wisp",
  yellow_dwarf: "ember_wisp",
  double: "binary_wyrm",
  triple: "binary_wyrm",
};

const FALLBACK_MONSTERS: SpaceMonsterType[] = [
  "nebula_manta",
  "void_ray",
  "crystal_hydra",
  "plasma_leviathan",
];

export const getSpaceMonsterTypeForStar = (
  starType: StarType,
  roll = Math.random(),
): SpaceMonsterType => {
  const preferred = STAR_MONSTERS[starType];
  if (preferred) return preferred;

  const index = Math.min(
    FALLBACK_MONSTERS.length - 1,
    Math.max(0, Math.floor(roll * FALLBACK_MONSTERS.length)),
  );
  return FALLBACK_MONSTERS[index];
};

export const getSpaceMonsterHuntReward = (
  monster: SpaceMonsterDefinition,
  threat: number,
): number =>
  monster.huntRewardBase + Math.floor(Math.max(0, threat - 1) / 2);
