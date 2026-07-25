/**
 * Карьерная (кросс-забеговая) прогрессия — живёт вне `GameState`, так как
 * `restartGame` полностью пересоздаёт `GameState` (см. META_PROGRESSION_PLAN.md).
 */
export interface MetaProgressState {
  metaVersion: number;
  runsCompleted: number;
  wins: number;
  losses: number;
  bossesDefeated: number;
  contractsCompleted: number;
  legendaryOrMythicArtifactsDiscovered: number;
  /** Объединение id кризисов, встреченных игроком, по всем забегам */
  discoveredCrisisIds: string[];
  /**
   * Бespoke-счётчики для доктрин, чьё условие — «повторить условие X в
   * N разных забегах» (см. таблицу ачивок в META_PROGRESSION_PLAN.md).
   * Инкрементируются в recordRunResult на основе RunSummary текущего
   * забега, отдельно от общих счётчиков выше.
   */
  winsWithSectors15Plus: number; // doctrine_explorer
  runsWithCredits3000Plus: number; // doctrine_trader
  winsWithHostileRep: number; // doctrine_exile
  unlockedAchievementIds: string[];
  unlockedShipIds: string[];
  /** Для идемпотентности recordRunResult — см. META_PROGRESSION_PLAN.md */
  lastRecordedRunId: string | null;
}

/**
 * Снимок итогов одного забега, вычисленный из финального `GameState` в
 * момент checkGameOver/triggerVictory. Чистые факты, без интерпретации —
 * решение, какая ачивка засчитана, принимает Фаза 2.
 */
export interface RunSummary {
  runId: string;
  outcome: "victory" | "defeat";
  turn: number;
  credits: number;
  crewAliveCount: number;
  sectorsExplored: number;
  maxVisitedSectorTier: number;
  researchedTechsCount: number;
  completedContractsCount: number;
  legendaryOrMythicArtifactsDiscovered: number;
  hasCursedArtifactActive: boolean;
  usedEmergencyFuelBailout: boolean;
  bossesDefeatedThisRun: number;
  maxEnemyThreatDefeatedThisRun: number;
  discoveredCrisisIds: string[];
  /** Кол-во рас с репутацией ≤ -50 на момент конца забега */
  hostileReputationRaceCount: number;
}
