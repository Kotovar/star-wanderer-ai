import type { MetaProgressState } from "./types";

/**
 * Корабли, доступные сразу без прогресса — не хранятся в unlockedShipIds
 * (тот массив — только то, что реально заработано), Фаза 3 комбинирует
 * оба списка при рендере карточек.
 */
export const ALWAYS_UNLOCKED_SHIP_IDS = ["explorer", "trader"];

/** dev_arsenal_fixture сюда не входит — он вне прогрессии, гейтится NODE_ENV (см. shipTemplates.ts). */
export const SHIP_UNLOCK_RULES: Record<
  string,
  (lifetime: MetaProgressState) => boolean
> = {
  scientist: (lifetime) => lifetime.runsCompleted >= 1,
  engineer: (lifetime) => lifetime.runsCompleted >= 1,
  fighter: (lifetime) => lifetime.wins >= 1,
};
