import { isModuleActive } from "@/game/modules";
import type { GameState, RandomEventType } from "@/game/types";

export type EventCategory = "bad" | "good" | "neutral";

type EventState = Pick<
  GameState,
  "crew" | "ship" | "credits" | "currentSector" | "artifacts"
>;

export interface EventMeta {
  category: EventCategory;
  baseWeight: number;
  weightFn?: (state: EventState) => number;
  eligible?: (state: EventState) => boolean;
}

const hasProfession = (
  state: EventState,
  profession: GameState["crew"][number]["profession"],
): boolean =>
  state.crew.some((c) => c.profession === profession && c.health > 0);

const hasActiveModule = (
  state: EventState,
  type: GameState["ship"]["modules"][number]["type"],
): boolean => state.ship.modules.some((m) => m.type === type && isModuleActive(m));

const avgHappiness = (state: EventState): number =>
  state.crew.length > 0
    ? state.crew.reduce((s, c) => s + c.happiness, 0) / state.crew.length
    : 50;

const fuelRatio = (state: EventState): number =>
  state.ship.maxFuel > 0 ? state.ship.fuel / state.ship.maxFuel : 0;

const sectorTier = (state: EventState): number =>
  state.currentSector?.tier ?? 1;

const EVENT_REGISTRY: Record<RandomEventType, EventMeta> = {
  // ── BAD events ──────────────────────────────────────────────
  storm: {
    category: "bad",
    baseWeight: 10,
    weightFn: (s) => (s.ship.shields <= 0 ? 1.6 : 1),
  },
  virus: {
    category: "bad",
    baseWeight: 8,
    weightFn: (s) =>
      (!hasProfession(s, "medic") ? 1.5 : 1) *
      (s.crew.length > 4 ? 1.3 : 1),
  },
  fuel_leak: {
    category: "bad",
    baseWeight: 8,
    weightFn: (s) => (fuelRatio(s) < 0.3 ? 1.5 : 1),
  },
  biohazard: {
    category: "bad",
    baseWeight: 7,
    weightFn: (s) =>
      (!hasProfession(s, "medic") ? 1.4 : 1) *
      (!hasActiveModule(s, "lifesupport") ? 1.3 : 1),
  },
  meteor_shower: {
    category: "bad",
    baseWeight: 8,
    weightFn: (s) => (sectorTier(s) >= 2 ? 1.5 : 1) * (s.ship.shields <= 0 ? 1.3 : 1),
  },
  pirate_raid: {
    category: "bad",
    baseWeight: 7,
    weightFn: (s) => (s.credits > 300 ? 1.3 : 1),
  },

  // ── GOOD events ─────────────────────────────────────────────
  capsule: {
    category: "good",
    baseWeight: 8,
    weightFn: (s) => (hasProfession(s, "scientist") ? 1.4 : 1),
  },
  distress_signal: {
    category: "good",
    baseWeight: 7,
    weightFn: (s) =>
      (hasProfession(s, "medic") ? 1.5 : 1) *
      (hasActiveModule(s, "medical") ? 1.3 : 1),
  },
  trader: {
    category: "good",
    baseWeight: 6,
    weightFn: (s) => (s.credits > 500 ? 1.4 : 1),
  },
  derelict: {
    category: "good",
    baseWeight: 7,
    weightFn: (s) =>
      (hasActiveModule(s, "scanner") ? 1.5 : 1) *
      (hasProfession(s, "scientist") ? 1.2 : 1),
  },

  // ── NEUTRAL events ──────────────────────────────────────────
  crew_dispute: {
    category: "neutral",
    baseWeight: 6,
    weightFn: (s) =>
      (avgHappiness(s) < 40 ? 1.8 : 1) * (s.crew.length > 5 ? 1.3 : 1),
  },
  ancient_signal: {
    category: "neutral",
    baseWeight: 5,
    weightFn: (s) =>
      (hasActiveModule(s, "lab") ? 1.5 : 1) *
      (sectorTier(s) >= 2 ? 1.3 : 1),
  },
  research_breakthrough: {
    category: "good",
    baseWeight: 5,
    weightFn: (s) =>
      (hasActiveModule(s, "lab") ? 1.6 : 1) *
      (sectorTier(s) >= 2 ? 1.4 : 1) *
      (hasProfession(s, "scientist") ? 1.3 : 1),
  },
  artifact_resonance: {
    category: "good",
    baseWeight: 6,
    eligible: (s) => s.artifacts.some((a) => a.discovered),
    weightFn: (s) =>
      (hasActiveModule(s, "lab") ? 1.4 : 1) *
      (hasProfession(s, "scientist") ? 1.3 : 1),
  },
};

const RANDOM_EVENT_TYPES = Object.keys(EVENT_REGISTRY) as RandomEventType[];

export function pickRandomEvent(state: EventState): RandomEventType {
  const weights = RANDOM_EVENT_TYPES.map((type) => {
    const meta = EVENT_REGISTRY[type];
    if (meta.eligible && !meta.eligible(state)) return 0;
    return meta.baseWeight * (meta.weightFn?.(state) ?? 1);
  });
  const total = weights.reduce((a, b) => a + b, 0);
  let roll = Math.random() * total;
  for (let i = 0; i < RANDOM_EVENT_TYPES.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return RANDOM_EVENT_TYPES[i];
  }
  return RANDOM_EVENT_TYPES[0];
}
