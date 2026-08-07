import { ALL_PROFESSIONS, type CrewMember } from "../types/crew.ts";
import type { MetaProgressState } from "./types";

/**
 * Корабли, доступные сразу без прогресса — не хранятся в unlockedShipIds
 * (тот массив — только то, что реально заработано), Фаза 3 комбинирует
 * оба списка при рендере карточек.
 */
export const ALWAYS_UNLOCKED_SHIP_IDS = ["explorer", "trader"];

export interface ShipUnlockRule {
  isUnlocked(lifetime: MetaProgressState): boolean;
  /** Для UI (Фаза 3) — числовой прогресс до разблокировки. */
  getProgress(lifetime: MetaProgressState): { current: number; target: number };
  /** Локаль текста условия, показывается на заблокированной карточке. */
  hintKey: string;
}

export const hasSyntheticCrewForEveryProfession = (
  crew: readonly CrewMember[],
): boolean => {
  const professions = new Set(
    crew
      .filter((member) => member.health > 0 && member.race === "synthetic")
      .map((member) => member.profession),
  );
  return ALL_PROFESSIONS.every((profession) => professions.has(profession));
};

/** dev_arsenal_fixture сюда не входит — он вне прогрессии, гейтится NODE_ENV (см. shipTemplates.ts). */
export const SHIP_UNLOCK_RULES: Record<string, ShipUnlockRule> = {
  scientist: {
    isUnlocked: (lifetime) => lifetime.runsCompleted >= 1,
    getProgress: (lifetime) => ({
      current: Math.min(lifetime.runsCompleted, 1),
      target: 1,
    }),
    hintKey: "new_game_setup.ship_unlock_any_run",
  },
  engineer: {
    isUnlocked: (lifetime) => lifetime.runsCompleted >= 1,
    getProgress: (lifetime) => ({
      current: Math.min(lifetime.runsCompleted, 1),
      target: 1,
    }),
    hintKey: "new_game_setup.ship_unlock_any_run",
  },
  fighter: {
    isUnlocked: (lifetime) => lifetime.wins >= 1,
    getProgress: (lifetime) => ({
      current: Math.min(lifetime.wins, 1),
      target: 1,
    }),
    hintKey: "new_game_setup.ship_unlock_win",
  },
  synthetic_drone: {
    isUnlocked: () => false,
    getProgress: () => ({ current: 0, target: 1 }),
    hintKey: "new_game_setup.ship_unlock_synthetic_drone",
  },
};
