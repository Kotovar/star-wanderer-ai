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
  /** Секторы тира 3+, посещённые за все забеги — doctrine_explorer */
  tier3SectorsVisited: number;
  /** Победы с хотя бы одной враждебной расой — doctrine_exile */
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
  /** Валовой доход за забег; стартовый баланс и траты не учитываются */
  creditsEarnedThisRun: number;
  crewAliveCount: number;
  sectorsExplored: number;
  /** Посещённые в этом забеге секторы тира 3+ */
  tier3SectorsVisited: number;
  maxVisitedSectorTier: number;
  /** Наибольшая достигнутая ёмкость топлива за забег */
  maxFuelCapacity: number;
  /** Наибольшее число членов экипажа 10-го уровня одновременно */
  level10CrewCount: number;
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
  /** Построек, доживших до конца забега */
  outpostsBuilt: number;
  /** Дошла ли база до максимального уровня */
  baseMaxedOut: boolean;
}
