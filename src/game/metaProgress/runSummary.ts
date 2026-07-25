import type { GameState } from "@/game/types";
import type { RunSummary } from "./types";

const HOSTILE_REPUTATION_THRESHOLD = -50;
const LEGENDARY_MYTHIC_RARITIES = new Set(["legendary", "mythic"]);

/**
 * Строит сводку итогов забега из финального `GameState`. Чистая функция —
 * не читает и не пишет мета-стор, только извлекает факты.
 *
 * `outcome` передаётся явно вызывающей стороной (checkGameOver/triggerVictory),
 * а не выводится из state.gameOver/gameVictory — снимок state захватывается
 * до того, как эти флаги проставлены (см. META_PROGRESSION_PLAN.md, раздел
 * «Порядок чтения финального GameState»).
 */
export function buildRunSummary(
  state: GameState,
  outcome: "victory" | "defeat",
): RunSummary {
  const sectorsExplored = state.galaxy.sectors.filter(
    (sector) => sector.visited,
  ).length;
  const maxVisitedSectorTier = state.galaxy.sectors.reduce(
    (max, sector) => (sector.visited ? Math.max(max, sector.tier) : max),
    0,
  );
  const hostileReputationRaceCount = Object.values(
    state.raceReputation,
  ).filter((rep) => rep <= HOSTILE_REPUTATION_THRESHOLD).length;

  return {
    runId: state.runId,
    outcome,
    turn: state.turn,
    credits: state.credits,
    crewAliveCount: state.crew.length,
    sectorsExplored,
    maxVisitedSectorTier,
    researchedTechsCount: state.research.researchedTechs.length,
    completedContractsCount: state.completedContractIds.length,
    legendaryOrMythicArtifactsDiscovered: state.artifacts.filter(
      (artifact) =>
        artifact.discovered && LEGENDARY_MYTHIC_RARITIES.has(artifact.rarity),
    ).length,
    hasCursedArtifactActive: state.artifacts.some(
      (artifact) => artifact.discovered && artifact.cursed,
    ),
    usedEmergencyFuelBailout: state.emergencyFuelStationIds.length > 0,
    bossesDefeatedThisRun: state.bossesDefeatedThisRun,
    maxEnemyThreatDefeatedThisRun: state.maxEnemyThreatDefeatedThisRun,
    discoveredCrisisIds: state.discoveredCrisisIds,
    hostileReputationRaceCount,
  };
}
