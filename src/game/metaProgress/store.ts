import type { CrewMember } from "../types/crew.ts";
import type { MetaProgressState, RunSummary } from "./types";
import { emptyMetaProgress, loadMetaProgress, saveMetaProgress } from "./storage.ts";
import { mergeUnique } from "./utils.ts";
import { ACHIEVEMENTS } from "./achievements.ts";
import {
  hasSyntheticCrewForEveryProfession,
  SHIP_UNLOCK_RULES,
} from "./shipUnlocks.ts";

let snapshot: MetaProgressState = loadMetaProgress();
const listeners = new Set<() => void>();

/** Стабильная ссылка — меняется только целиком, через commit(). Нужно для useSyncExternalStore. */
export function getMetaProgressSnapshot(): MetaProgressState {
  return snapshot;
}

/** localStorage-событие `storage` не стреляет в той же вкладке — поэтому свой pub/sub, не window.addEventListener("storage"). */
export function subscribeMetaProgress(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function commit(next: MetaProgressState): void {
  snapshot = next;
  saveMetaProgress(next);
  listeners.forEach((listener) => listener());
}

export function resetMetaProgress(): void {
  commit(emptyMetaProgress());
}

export function unlockSyntheticDroneIfEligible(
  crew: readonly CrewMember[],
): boolean {
  if (
    snapshot.unlockedShipIds.includes("synthetic_drone") ||
    !hasSyntheticCrewForEveryProfession(crew)
  ) {
    return false;
  }

  commit({
    ...snapshot,
    unlockedShipIds: mergeUnique(snapshot.unlockedShipIds, ["synthetic_drone"]),
  });
  return true;
}

/**
 * Учитывает итог одного забега в карьерной статистике и разблокирует новые
 * ачивки/корабли. Идемпотентна — повторный вызов с тем же runId (двойной
 * вызов из-за будущего рефакторинга, hot-reload и т.п.) не меняет состояние
 * второй раз.
 */
export function recordRunResult(summary: RunSummary): void {
  if (summary.runId === snapshot.lastRecordedRunId) return;

  const won = summary.outcome === "victory";
  const wonWithHostileRep = won && summary.hostileReputationRaceCount >= 1;

  const updatedCounters: MetaProgressState = {
    ...snapshot,
    runsCompleted: snapshot.runsCompleted + 1,
    wins: snapshot.wins + (won ? 1 : 0),
    losses: snapshot.losses + (won ? 0 : 1),
    bossesDefeated: snapshot.bossesDefeated + summary.bossesDefeatedThisRun,
    contractsCompleted:
      snapshot.contractsCompleted + summary.completedContractsCount,
    legendaryOrMythicArtifactsDiscovered:
      snapshot.legendaryOrMythicArtifactsDiscovered +
      summary.legendaryOrMythicArtifactsDiscovered,
    discoveredCrisisIds: mergeUnique(
      snapshot.discoveredCrisisIds,
      summary.discoveredCrisisIds,
    ),
    tier3SectorsVisited:
      snapshot.tier3SectorsVisited + summary.tier3SectorsVisited,
    winsWithHostileRep:
      snapshot.winsWithHostileRep + (wonWithHostileRep ? 1 : 0),
    lastRecordedRunId: summary.runId,
  };

  // Ачивки/корабли только добавляются, никогда не отзываются — уже
  // разблокированные не переоцениваются повторно.
  const newlyUnlockedAchievements = ACHIEVEMENTS.filter(
    (achievement) =>
      !updatedCounters.unlockedAchievementIds.includes(achievement.id) &&
      achievement.isSatisfied(updatedCounters, summary),
  ).map((achievement) => achievement.id);

  const newlyUnlockedShips = Object.entries(SHIP_UNLOCK_RULES)
    .filter(
      ([shipId, rule]) =>
        !updatedCounters.unlockedShipIds.includes(shipId) &&
        rule.isUnlocked(updatedCounters),
    )
    .map(([shipId]) => shipId);

  commit({
    ...updatedCounters,
    unlockedAchievementIds: mergeUnique(
      updatedCounters.unlockedAchievementIds,
      newlyUnlockedAchievements,
    ),
    unlockedShipIds: mergeUnique(
      updatedCounters.unlockedShipIds,
      newlyUnlockedShips,
    ),
  });
}
