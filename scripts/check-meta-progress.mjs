import assert from "node:assert/strict";
import { normalizeMetaProgress } from "../src/game/metaProgress/storage.ts";
import {
  getMetaProgressSnapshot,
  recordRunResult,
  resetMetaProgress,
  unlockSyntheticDroneIfEligible,
} from "../src/game/metaProgress/store.ts";
import { mergeUnique } from "../src/game/metaProgress/utils.ts";
import { ACHIEVEMENTS } from "../src/game/metaProgress/achievements.ts";
import { SHIP_UNLOCK_RULES } from "../src/game/metaProgress/shipUnlocks.ts";
import { SHIP_TEMPLATES } from "../src/game/constants/shipTemplates.ts";

// ── mergeUnique: dedup, no mutation of inputs ──
assert.deepEqual(mergeUnique(["a", "b"], ["b", "c"]), ["a", "b", "c"]);
assert.deepEqual(mergeUnique([], []), []);
assert.deepEqual(mergeUnique(["a", "a"], ["a"]), ["a"]);

// ── normalizeMetaProgress: garbage/partial input never throws, always yields safe shape ──
for (const garbage of [null, undefined, "not an object", 42, [], {}]) {
  const normalized = normalizeMetaProgress(garbage);
  assert.equal(typeof normalized.runsCompleted, "number");
  assert.ok(normalized.runsCompleted >= 0);
  assert.ok(Array.isArray(normalized.discoveredCrisisIds));
  assert.ok(Array.isArray(normalized.unlockedAchievementIds));
  assert.ok(Array.isArray(normalized.unlockedShipIds));
  assert.equal(normalized.lastRecordedRunId, null);
}

// ── normalizeMetaProgress: wrong-typed/negative/NaN/stale-id fields fall back individually ──
const weird = normalizeMetaProgress({
  runsCompleted: -5, // negative -> fallback
  wins: "3", // wrong type -> fallback
  losses: NaN, // NaN -> fallback
  bossesDefeated: Infinity, // not finite -> fallback
  contractsCompleted: 7, // valid -> passes through
  legendaryOrMythicArtifactsDiscovered: 2,
  discoveredCrisisIds: [
    "raider_wave",
    "raider_wave",
    "nebula_front",
    "not_a_real_crisis_id",
  ],
  // "veteran_crew" is a real achievement id, "not_a_real_achievement" isn't,
  // 5/null aren't strings — all three non-valid entries must be dropped.
  unlockedAchievementIds: ["veteran_crew", "not_a_real_achievement", 5, null],
  unlockedShipIds: ["explorer", "trader", "not_a_real_ship_id"],
  lastRecordedRunId: 123, // wrong type -> fallback
});
assert.equal(weird.runsCompleted, 0);
assert.equal(weird.wins, 0);
assert.equal(weird.losses, 0);
assert.equal(weird.bossesDefeated, 0);
assert.equal(weird.contractsCompleted, 7);
assert.equal(weird.legendaryOrMythicArtifactsDiscovered, 2);
assert.deepEqual(weird.discoveredCrisisIds, ["raider_wave", "nebula_front"]);
assert.deepEqual(weird.unlockedAchievementIds, ["veteran_crew"]);
assert.deepEqual(weird.unlockedShipIds, ["explorer", "trader"]);
assert.equal(weird.lastRecordedRunId, null);
assert.equal(weird.winsWithSectors15Plus, 0);
assert.equal(weird.runsWithCredits3000Plus, 0);
assert.equal(weird.winsWithHostileRep, 0);

assert.ok(
  normalizeMetaProgress({ unlockedShipIds: ["synthetic_drone"] }).unlockedShipIds.includes(
    "synthetic_drone",
  ),
  "synthetic drone id survives meta-progress normalization",
);

const syntheticDrone = SHIP_TEMPLATES.find((ship) => ship.id === "synthetic_drone");
assert.ok(syntheticDrone, "synthetic drone template exists");
assert.deepEqual(
  syntheticDrone.crew.map((member) => [member.race, member.profession]),
  [["synthetic", "pilot"], ["synthetic", "gunner"]],
  "synthetic drone starts with a pilot and gunner",
);
assert.ok(
  syntheticDrone.modules.some(
    (module) => module.type === "reactor" && module.level === 2,
  ),
  "synthetic drone has a Mk.2 reactor",
);
assert.ok(
  !syntheticDrone.modules.some((module) => module.type === "lifesupport"),
  "synthetic drone does not need life support",
);

// ── ACHIEVEMENTS: every one of the 16 must be present exactly once ──
const EXPECTED_ACHIEVEMENT_IDS = [
  "doctrine_explorer",
  "doctrine_boss_hunter",
  "doctrine_trader",
  "doctrine_exile",
  "veteran_crew",
  "extra_fuel",
  "research_head_start",
  "random_starting_tech",
  "solo_mission",
  "weakened_reactor",
  "crisis_start",
  "cursed_relic",
  "stranded",
  "damaged_ship",
  "wanted",
  "salvaged_parts",
];
assert.deepEqual(
  ACHIEVEMENTS.map((a) => a.id).sort(),
  [...EXPECTED_ACHIEVEMENT_IDS].sort(),
);

// ── ACHIEVEMENTS: off-by-one boundary check for every condition ──
function baseLifetime(overrides) {
  return {
    metaVersion: 1,
    runsCompleted: 0,
    wins: 0,
    losses: 0,
    bossesDefeated: 0,
    contractsCompleted: 0,
    legendaryOrMythicArtifactsDiscovered: 0,
    discoveredCrisisIds: [],
    winsWithSectors15Plus: 0,
    runsWithCredits3000Plus: 0,
    winsWithHostileRep: 0,
    unlockedAchievementIds: [],
    unlockedShipIds: [],
    lastRecordedRunId: null,
    ...overrides,
  };
}
function baseSummary(overrides) {
  return {
    runId: "boundary-test",
    outcome: "victory",
    turn: 1,
    credits: 0,
    crewAliveCount: 3,
    sectorsExplored: 0,
    maxVisitedSectorTier: 0,
    researchedTechsCount: 0,
    completedContractsCount: 0,
    legendaryOrMythicArtifactsDiscovered: 0,
    hasCursedArtifactActive: false,
    usedEmergencyFuelBailout: false,
    bossesDefeatedThisRun: 0,
    maxEnemyThreatDefeatedThisRun: 0,
    discoveredCrisisIds: [],
    hostileReputationRaceCount: 0,
    ...overrides,
  };
}
function achievementById(id) {
  const found = ACHIEVEMENTS.find((a) => a.id === id);
  assert.ok(found, `missing achievement definition: ${id}`);
  return found;
}

// Career-counter achievements: below vs at threshold, summary irrelevant.
const careerCases = [
  ["doctrine_explorer", "winsWithSectors15Plus", 1, 2],
  ["doctrine_boss_hunter", "bossesDefeated", 2, 3],
  ["doctrine_trader", "runsWithCredits3000Plus", 1, 2],
  ["doctrine_exile", "winsWithHostileRep", 1, 2],
  ["veteran_crew", "wins", 2, 3],
  ["random_starting_tech", "legendaryOrMythicArtifactsDiscovered", 1, 2],
  ["salvaged_parts", "contractsCompleted", 9, 10],
];
for (const [id, field, below, atTarget] of careerCases) {
  const achievement = achievementById(id);
  assert.equal(
    achievement.isSatisfied(baseLifetime({ [field]: below }), baseSummary()),
    false,
    `${id} must not unlock at ${field}=${below}`,
  );
  assert.equal(
    achievement.isSatisfied(baseLifetime({ [field]: atTarget }), baseSummary()),
    true,
    `${id} must unlock at ${field}=${atTarget}`,
  );
  const progress = achievement.getProgress?.(baseLifetime({ [field]: below }));
  assert.ok(progress, `${id} is a career achievement, must expose getProgress`);
  assert.equal(progress.current, below);
}

// crisis_start is career but keyed off array length, not a plain counter.
{
  const achievement = achievementById("crisis_start");
  assert.equal(
    achievement.isSatisfied(
      baseLifetime({ discoveredCrisisIds: ["raider_wave", "solar_flare", "epidemic"] }),
      baseSummary(),
    ),
    false,
  );
  assert.equal(
    achievement.isSatisfied(
      baseLifetime({
        discoveredCrisisIds: ["raider_wave", "solar_flare", "epidemic", "fuel_shortage"],
      }),
      baseSummary(),
    ),
    false,
  );
  assert.equal(
    achievement.isSatisfied(
      baseLifetime({
        discoveredCrisisIds: [
          "raider_wave",
          "solar_flare",
          "epidemic",
          "fuel_shortage",
          "nebula_front",
        ],
      }),
      baseSummary(),
    ),
    true,
  );
}

// Per-run achievements: lifetime irrelevant, summary decides.
const perRunCases = [
  ["extra_fuel", { turn: 99 }, { turn: 100 }],
  ["research_head_start", { researchedTechsCount: 4 }, { researchedTechsCount: 5 }],
  ["weakened_reactor", { maxVisitedSectorTier: 2 }, { maxVisitedSectorTier: 3 }],
  ["stranded", { usedEmergencyFuelBailout: false }, { usedEmergencyFuelBailout: true }],
  [
    "damaged_ship",
    { maxEnemyThreatDefeatedThisRun: 4 },
    { maxEnemyThreatDefeatedThisRun: 5 },
  ],
  ["wanted", { hostileReputationRaceCount: 1 }, { hostileReputationRaceCount: 2 }],
];
for (const [id, belowOverrides, atOverrides] of perRunCases) {
  const achievement = achievementById(id);
  assert.equal(
    achievement.isSatisfied(baseLifetime(), baseSummary(belowOverrides)),
    false,
    `${id} must not unlock below threshold`,
  );
  assert.equal(
    achievement.isSatisfied(baseLifetime(), baseSummary(atOverrides)),
    true,
    `${id} must unlock at threshold`,
  );
  assert.equal(
    achievement.getProgress,
    undefined,
    `${id} is per-run, must not expose getProgress`,
  );
}

// Per-run achievements that also require a victory outcome.
{
  const solo = achievementById("solo_mission");
  assert.equal(
    solo.isSatisfied(baseLifetime(), baseSummary({ outcome: "defeat", crewAliveCount: 1 })),
    false,
    "solo_mission must not unlock on defeat, even with 1 crew alive",
  );
  assert.equal(
    solo.isSatisfied(baseLifetime(), baseSummary({ outcome: "victory", crewAliveCount: 2 })),
    false,
    "solo_mission must not unlock with more than 1 crew alive",
  );
  assert.equal(
    solo.isSatisfied(baseLifetime(), baseSummary({ outcome: "victory", crewAliveCount: 1 })),
    true,
  );

  const cursed = achievementById("cursed_relic");
  assert.equal(
    cursed.isSatisfied(
      baseLifetime(),
      baseSummary({ outcome: "defeat", hasCursedArtifactActive: true }),
    ),
    false,
    "cursed_relic must not unlock on defeat",
  );
  assert.equal(
    cursed.isSatisfied(
      baseLifetime(),
      baseSummary({ outcome: "victory", hasCursedArtifactActive: true }),
    ),
    true,
  );
}

// ── SHIP_UNLOCK_RULES: boundary check + progress shape ──
assert.equal(SHIP_UNLOCK_RULES.scientist.isUnlocked(baseLifetime({ runsCompleted: 0 })), false);
assert.equal(SHIP_UNLOCK_RULES.scientist.isUnlocked(baseLifetime({ runsCompleted: 1 })), true);
assert.equal(SHIP_UNLOCK_RULES.engineer.isUnlocked(baseLifetime({ runsCompleted: 0 })), false);
assert.equal(SHIP_UNLOCK_RULES.engineer.isUnlocked(baseLifetime({ runsCompleted: 1 })), true);
assert.equal(SHIP_UNLOCK_RULES.fighter.isUnlocked(baseLifetime({ wins: 0 })), false);
assert.equal(SHIP_UNLOCK_RULES.fighter.isUnlocked(baseLifetime({ wins: 1 })), true);
assert.deepEqual(
  SHIP_UNLOCK_RULES.fighter.getProgress(baseLifetime({ wins: 0 })),
  { current: 0, target: 1 },
);
assert.deepEqual(
  SHIP_UNLOCK_RULES.fighter.getProgress(baseLifetime({ wins: 5 })),
  { current: 1, target: 1 },
  "getProgress must clamp current to target, not overshoot",
);
assert.ok(SHIP_UNLOCK_RULES.synthetic_drone, "synthetic drone has a lock rule");

resetMetaProgress();
const syntheticCrew = ["pilot", "engineer", "medic", "scout", "scientist", "gunner"].map(
  (profession, index) => ({
    id: index + 1,
    race: "synthetic",
    profession,
    health: 100,
  }),
);
assert.equal(
  unlockSyntheticDroneIfEligible(syntheticCrew),
  true,
  "a living synthetic in every profession unlocks the drone immediately",
);
assert.ok(getMetaProgressSnapshot().unlockedShipIds.includes("synthetic_drone"));
assert.equal(
  unlockSyntheticDroneIfEligible(syntheticCrew),
  false,
  "unlocking the drone is idempotent",
);

// ── recordRunResult: idempotent on repeated runId ──
function fakeSummary(overrides) {
  return {
    runId: "run-A",
    outcome: "victory",
    turn: 42,
    credits: 5000,
    crewAliveCount: 3,
    sectorsExplored: 10,
    maxVisitedSectorTier: 2,
    researchedTechsCount: 4,
    completedContractsCount: 3,
    legendaryOrMythicArtifactsDiscovered: 1,
    hasCursedArtifactActive: false,
    usedEmergencyFuelBailout: false,
    bossesDefeatedThisRun: 1,
    maxEnemyThreatDefeatedThisRun: 3,
    discoveredCrisisIds: ["raider_wave"],
    hostileReputationRaceCount: 0,
    ...overrides,
  };
}

const before = getMetaProgressSnapshot();
recordRunResult(fakeSummary({ runId: "run-A" }));
const afterFirst = getMetaProgressSnapshot();
assert.equal(afterFirst.runsCompleted, before.runsCompleted + 1);
assert.equal(afterFirst.wins, before.wins + 1);
assert.equal(afterFirst.bossesDefeated, before.bossesDefeated + 1);
assert.equal(afterFirst.contractsCompleted, before.contractsCompleted + 3);
assert.deepEqual(afterFirst.discoveredCrisisIds, ["raider_wave"]);
assert.equal(afterFirst.lastRecordedRunId, "run-A");
// Ship unlock rules fire through the real pipeline too, not just in isolation above.
assert.ok(afterFirst.unlockedShipIds.includes("scientist"));
assert.ok(afterFirst.unlockedShipIds.includes("engineer"));
assert.ok(afterFirst.unlockedShipIds.includes("fighter"));

// Same runId again, with wildly different (deliberately absurd) payload — must be a strict no-op.
recordRunResult(
  fakeSummary({
    runId: "run-A",
    credits: 999999,
    bossesDefeatedThisRun: 99,
    completedContractsCount: 99,
  }),
);
assert.deepEqual(getMetaProgressSnapshot(), afterFirst);

// A genuinely new runId does apply, and a defeat increments losses, not wins.
recordRunResult(
  fakeSummary({
    runId: "run-B",
    outcome: "defeat",
    bossesDefeatedThisRun: 0,
    completedContractsCount: 0,
    discoveredCrisisIds: ["solar_flare"],
  }),
);
const afterSecondRun = getMetaProgressSnapshot();
assert.equal(afterSecondRun.runsCompleted, afterFirst.runsCompleted + 1);
assert.equal(afterSecondRun.losses, afterFirst.losses + 1);
assert.equal(afterSecondRun.wins, afterFirst.wins);
assert.deepEqual(afterSecondRun.discoveredCrisisIds, [
  "raider_wave",
  "solar_flare",
]);
assert.equal(afterSecondRun.lastRecordedRunId, "run-B");

// ── recordRunResult: full pipeline actually unlocks an achievement once its threshold is crossed ──
{
  const baseline = getMetaProgressSnapshot();
  assert.ok(
    !baseline.unlockedAchievementIds.includes("doctrine_boss_hunter"),
    "doctrine_boss_hunter must not be unlocked yet at this point in the script",
  );
  const bossesSoFar = baseline.bossesDefeated;
  const stillNeeded = Math.max(0, 3 - bossesSoFar);

  for (let i = 0; i < stillNeeded - 1; i++) {
    recordRunResult(
      fakeSummary({ runId: `boss-run-${i}`, bossesDefeatedThisRun: 1, credits: 0 }),
    );
  }
  assert.ok(
    !getMetaProgressSnapshot().unlockedAchievementIds.includes("doctrine_boss_hunter"),
    "must still be locked one boss short of the threshold",
  );

  recordRunResult(
    fakeSummary({ runId: "boss-run-final", bossesDefeatedThisRun: 1, credits: 0 }),
  );
  const finalSnapshot = getMetaProgressSnapshot();
  assert.equal(finalSnapshot.bossesDefeated, 3);
  assert.ok(finalSnapshot.unlockedAchievementIds.includes("doctrine_boss_hunter"));

  // Recording another boss kill must not duplicate the id or throw.
  recordRunResult(
    fakeSummary({ runId: "boss-run-extra", bossesDefeatedThisRun: 1, credits: 0 }),
  );
  const countInList = getMetaProgressSnapshot().unlockedAchievementIds.filter(
    (id) => id === "doctrine_boss_hunter",
  ).length;
  assert.equal(countInList, 1);
}

// A full progress reset must also clear the in-memory snapshot used by open UI.
resetMetaProgress();
assert.deepEqual(getMetaProgressSnapshot(), normalizeMetaProgress({}));

console.log("Meta-progress checks passed");
