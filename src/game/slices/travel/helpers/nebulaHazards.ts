import type { GameState } from "@/game/types";

export type NebulaDisruption = "fuel_loss" | "module_damage" | "drift";

export const NEBULA_DISRUPTION_CHANCE = 0.6;
const NEBULA_FUEL_LOSS = 8;
const NEBULA_MODULE_DAMAGE = 15;
const NEBULA_DISRUPTIONS: readonly NebulaDisruption[] = [
  "fuel_loss",
  "module_damage",
  "drift",
];

export const rollNebulaDisruption = (
  random: () => number,
): NebulaDisruption | null => {
  if (random() >= NEBULA_DISRUPTION_CHANCE) return null;

  return NEBULA_DISRUPTIONS[
    Math.min(
      NEBULA_DISRUPTIONS.length - 1,
      Math.floor(random() * NEBULA_DISRUPTIONS.length),
    )
  ];
};

export const getNebulaDisruptionPatch = (
  state: Pick<GameState, "ship" | "traveling">,
  disruption: NebulaDisruption,
  random: () => number,
): Pick<GameState, "ship" | "traveling"> | null => {
  const traveling = state.traveling;
  if (!traveling?.nebulaId || traveling.nebulaChecked) return null;

  const checkedTraveling = { ...traveling, nebulaChecked: true };
  if (disruption === "fuel_loss") {
    return {
      ship: { ...state.ship, fuel: Math.max(0, state.ship.fuel - NEBULA_FUEL_LOSS) },
      traveling: checkedTraveling,
    };
  }

  if (disruption === "drift") {
    return {
      ship: state.ship,
      traveling: { ...checkedTraveling, turnsLeft: traveling.turnsLeft + 1 },
    };
  }

  const candidates = state.ship.modules.filter(
    (module) =>
      module.health > 10 && !module.disabled && !module.manualDisabled,
  );
  if (candidates.length === 0) {
    return {
      ship: { ...state.ship, fuel: Math.max(0, state.ship.fuel - NEBULA_FUEL_LOSS) },
      traveling: checkedTraveling,
    };
  }

  const target = candidates[
    Math.min(candidates.length - 1, Math.floor(random() * candidates.length))
  ];
  return {
    ship: {
      ...state.ship,
      modules: state.ship.modules.map((module) =>
        module.id === target.id
          ? { ...module, health: Math.max(10, module.health - NEBULA_MODULE_DAMAGE) }
          : module,
      ),
    },
    traveling: checkedTraveling,
  };
};
