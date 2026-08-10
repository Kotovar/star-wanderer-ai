import type { MetaProgressState, RunSummary } from "./types";

export interface AchievementProgress {
  current: number;
  target: number;
}

export interface AchievementDef {
  /** Совпадает с id из LAUNCH_MODIFIERS — какой модификатор/доктрину открывает эта ачивка */
  id: string;
  nameKey: string;
  descriptionKey: string;
  /**
   * Проверяется при каждом завершённом забеге, пока ачивка ещё не в
   * unlockedAchievementIds. `lifetime` — уже обновлённые счётчики этого
   * забега (см. store.ts: recordRunResult считает счётчики раньше, чем
   * прогоняет эту функцию), `summary` — сводка именно завершившегося забега.
   */
  isSatisfied(lifetime: MetaProgressState, summary: RunSummary): boolean;
  /** Только для карьерных условий — числовой прогресс для UI (Фаза 3/4). За-забег условия его не задают: дробный прогресс для них не имеет смысла. */
  getProgress?(lifetime: MetaProgressState): AchievementProgress;
}

const DOCTRINE_REPEAT_TARGET = 2;
const BOSSES_TARGET = 3;
const WINS_TARGET = 3;
const ARTIFACTS_TARGET = 2;
const CONTRACTS_TARGET = 10;
const CRISIS_TYPES_TOTAL = 5;
const SURVIVE_TURN_TARGET = 100;
const RESEARCH_TECHS_TARGET = 5;
const SECTOR_TIER_TARGET = 3;
const HIGH_THREAT_TARGET = 5;
const HOSTILE_RACES_AT_ONCE_TARGET = 2;

export const ACHIEVEMENTS: AchievementDef[] = [
  // ── Доктрины — все требуют условий за карьеру (см. META_PROGRESSION_PLAN.md) ──
  {
    id: "doctrine_explorer",
    nameKey: "achievements.doctrine_explorer.name",
    descriptionKey: "achievements.doctrine_explorer.description",
    isSatisfied: (lifetime) =>
      lifetime.winsWithSectors15Plus >= DOCTRINE_REPEAT_TARGET,
    getProgress: (lifetime) => ({
      current: lifetime.winsWithSectors15Plus,
      target: DOCTRINE_REPEAT_TARGET,
    }),
  },
  {
    id: "doctrine_boss_hunter",
    nameKey: "achievements.doctrine_boss_hunter.name",
    descriptionKey: "achievements.doctrine_boss_hunter.description",
    isSatisfied: (lifetime) => lifetime.bossesDefeated >= BOSSES_TARGET,
    getProgress: (lifetime) => ({
      current: lifetime.bossesDefeated,
      target: BOSSES_TARGET,
    }),
  },
  {
    id: "doctrine_trader",
    nameKey: "achievements.doctrine_trader.name",
    descriptionKey: "achievements.doctrine_trader.description",
    isSatisfied: (lifetime) =>
      lifetime.runsWithCredits3000Plus >= DOCTRINE_REPEAT_TARGET,
    getProgress: (lifetime) => ({
      current: lifetime.runsWithCredits3000Plus,
      target: DOCTRINE_REPEAT_TARGET,
    }),
  },
  {
    id: "doctrine_exile",
    nameKey: "achievements.doctrine_exile.name",
    descriptionKey: "achievements.doctrine_exile.description",
    isSatisfied: (lifetime) =>
      lifetime.winsWithHostileRep >= DOCTRINE_REPEAT_TARGET,
    getProgress: (lifetime) => ({
      current: lifetime.winsWithHostileRep,
      target: DOCTRINE_REPEAT_TARGET,
    }),
  },

  // ── Обычные модификаторы — смесь «за забег» и «за карьеру» ──
  {
    id: "veteran_crew",
    nameKey: "achievements.veteran_crew.name",
    descriptionKey: "achievements.veteran_crew.description",
    isSatisfied: (lifetime) => lifetime.wins >= WINS_TARGET,
    getProgress: (lifetime) => ({ current: lifetime.wins, target: WINS_TARGET }),
  },
  {
    id: "extra_fuel",
    nameKey: "achievements.extra_fuel.name",
    descriptionKey: "achievements.extra_fuel.description",
    isSatisfied: (_lifetime, summary) => summary.turn >= SURVIVE_TURN_TARGET,
  },
  {
    id: "research_head_start",
    nameKey: "achievements.research_head_start.name",
    descriptionKey: "achievements.research_head_start.description",
    isSatisfied: (_lifetime, summary) =>
      summary.researchedTechsCount >= RESEARCH_TECHS_TARGET,
  },
  {
    id: "random_starting_tech",
    nameKey: "achievements.random_starting_tech.name",
    descriptionKey: "achievements.random_starting_tech.description",
    isSatisfied: (lifetime) =>
      lifetime.legendaryOrMythicArtifactsDiscovered >= ARTIFACTS_TARGET,
    getProgress: (lifetime) => ({
      current: lifetime.legendaryOrMythicArtifactsDiscovered,
      target: ARTIFACTS_TARGET,
    }),
  },
  {
    id: "solo_mission",
    nameKey: "achievements.solo_mission.name",
    descriptionKey: "achievements.solo_mission.description",
    isSatisfied: (_lifetime, summary) =>
      summary.outcome === "victory" && summary.crewAliveCount === 1,
  },
  {
    id: "weakened_reactor",
    nameKey: "achievements.weakened_reactor.name",
    descriptionKey: "achievements.weakened_reactor.description",
    isSatisfied: (_lifetime, summary) =>
      summary.maxVisitedSectorTier >= SECTOR_TIER_TARGET,
  },
  {
    id: "crisis_start",
    nameKey: "achievements.crisis_start.name",
    descriptionKey: "achievements.crisis_start.description",
    isSatisfied: (lifetime) =>
      lifetime.discoveredCrisisIds.length >= CRISIS_TYPES_TOTAL,
    getProgress: (lifetime) => ({
      current: lifetime.discoveredCrisisIds.length,
      target: CRISIS_TYPES_TOTAL,
    }),
  },
  {
    id: "cursed_relic",
    nameKey: "achievements.cursed_relic.name",
    descriptionKey: "achievements.cursed_relic.description",
    isSatisfied: (_lifetime, summary) =>
      summary.outcome === "victory" && summary.hasCursedArtifactActive,
  },
  {
    id: "stranded",
    nameKey: "achievements.stranded.name",
    descriptionKey: "achievements.stranded.description",
    isSatisfied: (_lifetime, summary) => summary.usedEmergencyFuelBailout,
  },
  {
    id: "damaged_ship",
    nameKey: "achievements.damaged_ship.name",
    descriptionKey: "achievements.damaged_ship.description",
    isSatisfied: (_lifetime, summary) =>
      summary.maxEnemyThreatDefeatedThisRun >= HIGH_THREAT_TARGET,
  },
  {
    id: "wanted",
    nameKey: "achievements.wanted.name",
    descriptionKey: "achievements.wanted.description",
    isSatisfied: (_lifetime, summary) =>
      summary.hostileReputationRaceCount >= HOSTILE_RACES_AT_ONCE_TARGET,
  },
  {
    id: "salvaged_parts",
    nameKey: "achievements.salvaged_parts.name",
    descriptionKey: "achievements.salvaged_parts.description",
    isSatisfied: (lifetime) => lifetime.contractsCompleted >= CONTRACTS_TARGET,
    getProgress: (lifetime) => ({
      current: lifetime.contractsCompleted,
      target: CONTRACTS_TARGET,
    }),
  },
];

export const ACHIEVEMENT_IDS = new Set(ACHIEVEMENTS.map((a) => a.id));
