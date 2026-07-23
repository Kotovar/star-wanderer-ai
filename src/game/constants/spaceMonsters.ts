import type { TimedEffectId } from "@/game/effects/timedEffects";
import type {
  BossModuleEffect,
  ResearchResourceType,
  SpaceMonsterType,
  StarType,
} from "@/game/types";

export type SpaceMonsterFirstContact =
  | {
      type: "reveal_sector";
      descriptionKey: string;
    }
  | {
      type: "heal_crew";
      descriptionKey: string;
      value: number;
    }
  | {
      type: "refuel";
      descriptionKey: string;
      value: number;
    }
  | {
      type: "artifact_hint";
      descriptionKey: string;
    };

export type SpaceMonsterDefinition = {
  nameKey: string;
  descriptionKey: string;
  behaviorKey: string;
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
    icon: "🦋",
    color: "#22d3ee",
    threatBonus: 0,
    resonanceEffect: "nebula_manta_pact",
    huntReward: "alien_biology",
    huntRewardBase: 2,
    firstContact: {
      type: "heal_crew",
      descriptionKey: "space_monsters.nebula_manta.first_contact",
      value: 8,
    },
    moduleEffect: { type: "heal_on_damage", value: 20 },
  },
  plasma_leviathan: {
    nameKey: "space_monsters.plasma_leviathan.name",
    descriptionKey: "space_monsters.plasma_leviathan.description",
    behaviorKey: "space_monsters.plasma_leviathan.behavior",
    icon: "🐉",
    color: "#fb923c",
    threatBonus: 1,
    resonanceEffect: "plasma_leviathan_pact",
    huntReward: "energy_samples",
    huntRewardBase: 2,
    firstContact: {
      type: "refuel",
      descriptionKey: "space_monsters.plasma_leviathan.first_contact",
      value: 30,
    },
    moduleEffect: { type: "damage_aura", value: 5 },
  },
  crystal_hydra: {
    nameKey: "space_monsters.crystal_hydra.name",
    descriptionKey: "space_monsters.crystal_hydra.description",
    behaviorKey: "space_monsters.crystal_hydra.behavior",
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
};

const STAR_MONSTERS: Partial<Record<StarType, SpaceMonsterType>> = {
  blackhole: "void_ray",
  stellar_remnant: "void_ray",
  gas_giant: "nebula_manta",
  variable_star: "nebula_manta",
  blue_giant: "plasma_leviathan",
  red_supergiant: "plasma_leviathan",
  neutron_star: "crystal_hydra",
  white_dwarf: "crystal_hydra",
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
