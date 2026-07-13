import type {
  ActiveEffect,
  EffectPolarity,
  EffectSource,
  GameState,
  GameStore,
  SetState,
} from "@/game/types";
import { store as i18nStore } from "@/lib/useTranslation";

export type TimedEffectId =
  | "coordinated_shift"
  | "combat_momentum"
  | "anomaly_resonance"
  | "anomaly_interference"
  | "decisive_response"
  | "void_ray_pact"
  | "nebula_manta_pact"
  | "plasma_leviathan_pact"
  | "crystal_hydra_pact";

interface TimedEffectDefinition {
  id: TimedEffectId;
  source: Exclude<EffectSource, "planet">;
  polarity: EffectPolarity;
  icon: string;
  color: string;
  duration: number;
  effects: ActiveEffect["effects"];
}

export const TIMED_EFFECTS: Record<TimedEffectId, TimedEffectDefinition> = {
  coordinated_shift: {
    id: "coordinated_shift",
    source: "crew",
    polarity: "positive",
    icon: "🛠️",
    color: "#00d4ff",
    duration: 6,
    effects: [
      { type: "power_boost", value: 2 },
      { type: "health_regen", value: 1 },
    ],
  },
  combat_momentum: {
    id: "combat_momentum",
    source: "combat",
    polarity: "positive",
    icon: "⚔️",
    color: "#ff6680",
    duration: 5,
    effects: [
      { type: "combat_bonus", value: 0.1 },
      { type: "evasion_bonus", value: 0.05 },
    ],
  },
  anomaly_resonance: {
    id: "anomaly_resonance",
    source: "anomaly",
    polarity: "positive",
    icon: "🌀",
    color: "#b46cff",
    duration: 7,
    effects: [
      { type: "fuel_efficiency", value: 0.12 },
      { type: "power_boost", value: 2 },
    ],
  },
  anomaly_interference: {
    id: "anomaly_interference",
    source: "anomaly",
    polarity: "negative",
    icon: "☣️",
    color: "#ffb000",
    duration: 5,
    effects: [{ type: "fuel_efficiency", value: -0.1 }],
  },
  decisive_response: {
    id: "decisive_response",
    source: "event",
    polarity: "positive",
    icon: "◆",
    color: "#00ff41",
    duration: 5,
    effects: [
      { type: "evasion_bonus", value: 0.04 },
      { type: "health_regen", value: 1 },
    ],
  },
  void_ray_pact: {
    id: "void_ray_pact",
    source: "event",
    polarity: "positive",
    icon: "🪼",
    color: "#8b5cf6",
    duration: 15,
    effects: [
      { type: "fuel_efficiency", value: 0.18 },
      { type: "evasion_bonus", value: 0.05 },
    ],
  },
  nebula_manta_pact: {
    id: "nebula_manta_pact",
    source: "event",
    polarity: "positive",
    icon: "🦋",
    color: "#22d3ee",
    duration: 15,
    effects: [
      { type: "power_boost", value: 3 },
      { type: "health_regen", value: 1 },
    ],
  },
  plasma_leviathan_pact: {
    id: "plasma_leviathan_pact",
    source: "event",
    polarity: "positive",
    icon: "🐉",
    color: "#fb923c",
    duration: 15,
    effects: [
      { type: "combat_bonus", value: 0.12 },
      { type: "power_boost", value: 2 },
    ],
  },
  crystal_hydra_pact: {
    id: "crystal_hydra_pact",
    source: "event",
    polarity: "positive",
    icon: "💠",
    color: "#c084fc",
    duration: 15,
    effects: [
      { type: "combat_bonus", value: 0.08 },
      { type: "evasion_bonus", value: 0.1 },
    ],
  },
};

type MutableSetState = (updater: (state: GameState) => void) => void;

export function grantTimedEffect(
  effectId: TimedEffectId,
  set: SetState,
  get: () => GameStore,
): void;
export function grantTimedEffect(
  effectId: TimedEffectId,
  set: MutableSetState,
  get: () => GameStore,
): void;

export function grantTimedEffect(
  effectId: TimedEffectId,
  set: SetState | MutableSetState,
  get: () => GameStore,
): void {
  const definition = TIMED_EFFECTS[effectId];
  const existing = get().activeEffects.find(
    (effect) => effect.definitionId === effectId,
  );
  const mutate = set as MutableSetState;

  if (existing) {
    mutate((state) => {
      const effect = state.activeEffects.find((item) => item.id === existing.id);
      if (effect) effect.turnsRemaining = definition.duration;
    });
    return;
  }

  const activeEffect: ActiveEffect = {
    id: `effect-${effectId}-${Date.now()}`,
    definitionId: effectId,
    name: i18nStore.t(`effects.items.${effectId}.name`),
    description: i18nStore.t(`effects.items.${effectId}.description`),
    nameKey: `effects.items.${effectId}.name`,
    descriptionKey: `effects.items.${effectId}.description`,
    source: definition.source,
    polarity: definition.polarity,
    icon: definition.icon,
    color: definition.color,
    acquiredTurn: get().turn,
    totalTurns: definition.duration,
    turnsRemaining: definition.duration,
    effects: definition.effects,
  };

  const power = definition.effects
    .filter((effect) => effect.type === "power_boost")
    .reduce((sum, effect) => sum + Number(effect.value), 0);
  const evasion = definition.effects
    .filter((effect) => effect.type === "evasion_bonus")
    .reduce((sum, effect) => sum + Math.round(Number(effect.value) * 100), 0);
  const damage = definition.effects
    .filter((effect) => effect.type === "combat_bonus")
    .reduce((sum, effect) => sum + Number(effect.value), 0);

  mutate((state) => {
    state.activeEffects.push(activeEffect);
    state.ship.bonusPower = (state.ship.bonusPower ?? 0) + power;
    state.ship.bonusEvasion = (state.ship.bonusEvasion ?? 0) + evasion;
    state.ship.bonusDamage = (state.ship.bonusDamage ?? 0) + damage;
  });
  get().addLog(
    i18nStore.t("effects.logs.received", { name: activeEffect.name }),
    definition.polarity === "negative" ? "warning" : "info",
  );
}
