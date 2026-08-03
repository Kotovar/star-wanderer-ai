import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";

const require = createRequire(import.meta.url);
const scriptPath = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(scriptPath), "..");
const jiti = require("jiti")(scriptPath, {
  alias: { "@": path.join(root, "src") },
});

const {
  getRunProfileArcProgress,
  getRunProfileArcEncounter,
  getRunProfileArcRewardPatch,
  getRunProfileArcTargetPatch,
  isRunProfileArcSignal,
  maybeRevealRunProfileArcTarget,
} = jiti("../src/game/galaxy/runProfileArcs.ts");
const { loadWithMigrations } = jiti("../src/game/saves/migrations.ts");

const sector = (id, tier, locations) => ({ id, tier, locations });

assert.equal(
  isRunProfileArcSignal(
    "ancient_echo",
    { id: "visited-anomaly", type: "anomaly", visited: true },
    [],
  ),
  false,
  "opening an anomaly must not confirm a signal",
);
assert.equal(
  isRunProfileArcSignal(
    "ancient_echo",
    { id: "researched-anomaly", type: "anomaly" },
    ["researched-anomaly"],
  ),
  true,
);
assert.equal(
  isRunProfileArcSignal(
    "ancient_echo",
    { id: "dive", type: "gas_giant", gasGiantLastDiveAt: 12 },
    [],
  ),
  true,
);

assert.equal(
  isRunProfileArcSignal(
    "war_spiral",
    { id: "enemy", type: "enemy", defeated: true },
    [],
  ),
  true,
);
assert.equal(
  isRunProfileArcSignal(
    "war_spiral",
    { id: "hunted", type: "space_monster", spaceMonsterResolved: "hunted" },
    [],
  ),
  true,
);
assert.equal(
  isRunProfileArcSignal(
    "war_spiral",
    { id: "peaceful", type: "space_monster", spaceMonsterResolved: "pact" },
    [],
  ),
  false,
  "peaceful monster contact must not confirm a signal",
);

assert.equal(
  isRunProfileArcSignal(
    "broken_trade_lanes",
    { id: "distress", type: "distress_signal", signalResolved: true },
    [],
  ),
  true,
);
assert.equal(
  isRunProfileArcSignal(
    "broken_trade_lanes",
    { id: "derelict", type: "derelict_ship", derelictExplored: true },
    [],
  ),
  true,
);
assert.equal(
  isRunProfileArcSignal(
    "broken_trade_lanes",
    { id: "wreck", type: "wreck_field", wreckExhausted: true },
    [],
  ),
  true,
);
assert.equal(
  isRunProfileArcSignal(
    "broken_trade_lanes",
    { id: "partial-wreck", type: "wreck_field", wreckPassesDone: 1 },
    [],
  ),
  false,
  "a partial wreck salvage must not confirm a signal",
);

const sameSector = [
  sector(1, 1, [
    { id: "enemy", type: "enemy", defeated: true },
    { id: "monster", type: "space_monster", spaceMonsterResolved: "hunted" },
  ]),
];
assert.equal(
  getRunProfileArcProgress("war_spiral", sameSector, []).confirmed,
  1,
  "one sector can only confirm one signal",
);

const threeCompletedSectors = [
  sector(1, 1, [{ id: "a", type: "anomaly" }]),
  sector(2, 2, [{ id: "b", type: "anomaly" }]),
  sector(3, 2, [{ id: "c", type: "gas_giant", gasGiantLastDiveAt: 8 }]),
];
const ancientProgress = getRunProfileArcProgress(
  "ancient_echo",
  threeCompletedSectors,
  ["a", "b"],
);
assert.equal(ancientProgress.confirmed, 3);
assert.deepEqual(ancientProgress.confirmedSectorIds, [1, 2, 3]);
assert.equal(ancientProgress.isReady, true);
assert.equal(getRunProfileArcProgress(null, threeCompletedSectors, ["a", "b"]), null);

const migrated = loadWithMigrations(
  JSON.stringify({
    version: 19,
    state: { runProfileArcRewardClaimed: true },
  }),
);
assert.equal(migrated?.runProfileArcTarget, null);
assert.equal(migrated?.runProfileArcRewardClaimed, true);

const withConstantRandom = (value, callback) => {
  const originalRandom = Math.random;
  Math.random = () => value;
  try {
    return callback();
  } finally {
    Math.random = originalRandom;
  }
};

const readyState = {
  runProfileId: "ancient_echo",
  runProfileArcRewardClaimed: false,
  runProfileArcTarget: null,
  completedLocations: ["signal-1", "signal-2", "signal-3"],
  galaxy: {
    sectors: [
      {
        ...sector(1, 1, [{ id: "signal-1", type: "anomaly" }]),
        name: "Alpha",
        star: { type: "red_dwarf", name: "star_types.red_dwarf" },
      },
      {
        ...sector(2, 2, [{ id: "signal-2", type: "anomaly" }]),
        name: "Beta",
        star: { type: "red_dwarf", name: "star_types.red_dwarf" },
      },
      {
        ...sector(3, 2, [{ id: "signal-3", type: "anomaly" }]),
        name: "Gamma",
        star: { type: "red_dwarf", name: "star_types.red_dwarf" },
      },
      {
        ...sector(30, 3, []),
        name: "Black-hole target",
        star: { type: "blackhole", name: "star_types.blackhole" },
      },
      {
        ...sector(31, 3, []),
        name: "Target sector",
        star: { type: "red_dwarf", name: "star_types.red_dwarf" },
      },
    ],
  },
  currentSector: null,
};

const targetPatch = withConstantRandom(0, () =>
  getRunProfileArcTargetPatch(readyState),
);
assert.equal(targetPatch?.runProfileArcTarget?.tier, 3);
assert.equal(targetPatch?.runProfileArcTarget?.sectorId, 31);
assert.equal(
  targetPatch?.galaxy.sectors
    .find((candidate) => candidate.id === 31)
    ?.locations.at(-1)?.type,
  "profile_signal",
);
assert.equal(
  targetPatch?.galaxy.sectors
    .find((candidate) => candidate.id === 31)
    ?.locations.at(-1)?.name,
  "location_types.profile_signal",
);
assert.equal(
  getRunProfileArcTargetPatch({
    ...readyState,
    runProfileArcTarget: targetPatch?.runProfileArcTarget ?? null,
  }),
  null,
);
assert.equal(
  getRunProfileArcTargetPatch({
    ...readyState,
    completedLocations: ["signal-1", "signal-2"],
  }),
  null,
);

const reloaded = loadWithMigrations(
  JSON.stringify({
    version: 20,
    state: { ...readyState, ...targetPatch },
  }),
);
assert.deepEqual(reloaded?.runProfileArcTarget, targetPatch?.runProfileArcTarget);

const revealedState = structuredClone(readyState);
let coordinateSaves = 0;
const coordinateLogs = [];
const revealSet = (patch) => {
  Object.assign(
    revealedState,
    typeof patch === "function" ? patch(revealedState) : patch,
  );
};
const revealGet = () => ({
  ...revealedState,
  addLog: (...args) => coordinateLogs.push(args),
  saveGame: () => {
    coordinateSaves += 1;
  },
});
withConstantRandom(0, () => {
  maybeRevealRunProfileArcTarget(revealSet, revealGet);
  maybeRevealRunProfileArcTarget(revealSet, revealGet);
});
assert.equal(revealedState.runProfileArcTarget?.sectorId, 31);
assert.equal(coordinateSaves, 1);
assert.equal(coordinateLogs.length, 1);

for (const file of [
  "src/game/slices/locations/helpers/handleAnomaly.ts",
  "src/game/slices/locations/helpers/gasGiant/surfaceDive.ts",
  "src/game/slices/locations/helpers/respondToDistressSignal.ts",
  "src/game/slices/locations/helpers/exploreDerelictShip.ts",
  "src/game/slices/locations/helpers/salvageWreckField.ts",
  "src/game/slices/combat/helpers/playerVictory.ts",
]) {
  const source = readFileSync(path.join(root, file), "utf8");
  assert.match(
    source,
    /maybeRevealRunProfileArcTarget/,
    `${file} must reveal coordinates after a qualifying action`,
  );
}

const warTarget = {
  profileId: "war_spiral",
  sectorId: 31,
  locationId: "profile-signal-war_spiral-31",
  tier: 3,
};
const targetLocation = {
  id: warTarget.locationId,
  type: "profile_signal",
  name: "location_types.profile_signal",
};
const warEncounter = getRunProfileArcEncounter(warTarget);
assert.equal(warEncounter.enemyType, "raider");
assert.equal(warEncounter.signalRevealed, true);
assert.equal(warEncounter.threat, 4);

const rewardState = {
  runProfileArcTarget: warTarget,
  runProfileArcRewardClaimed: false,
  currentLocation: { ...targetLocation, defeated: true },
  research: { resources: { ancient_data: 2 } },
};
assert.equal(
  getRunProfileArcRewardPatch({
    ...rewardState,
    currentLocation: { ...targetLocation, defeated: false },
  }),
  null,
  "the target reward requires combat victory",
);
assert.deepEqual(getRunProfileArcRewardPatch(rewardState), {
  research: {
    resources: { ancient_data: 2, alien_biology: 5, tech_salvage: 3 },
  },
  runProfileArcRewardClaimed: true,
});
assert.equal(
  getRunProfileArcRewardPatch({
    ...rewardState,
    runProfileArcRewardClaimed: true,
  }),
  null,
  "the target reward is paid only once",
);
assert.deepEqual(
  getRunProfileArcRewardPatch({
    ...rewardState,
    runProfileArcTarget: {
      ...warTarget,
      profileId: "ancient_echo",
    },
  })?.research.resources,
  { ancient_data: 8, quantum_crystals: 1 },
);
assert.deepEqual(
  getRunProfileArcRewardPatch({
    ...rewardState,
    runProfileArcTarget: {
      ...warTarget,
      profileId: "broken_trade_lanes",
    },
  })?.research.resources,
  { ancient_data: 2, rare_minerals: 5, tech_salvage: 3 },
);

const selectLocationSource = readFileSync(
  path.join(root, "src/game/slices/travel/helpers/selectLocation.ts"),
  "utf8",
);
assert.match(selectLocationSource, /case "profile_signal"/);
const profileSignalBranch = selectLocationSource.match(
  /case "profile_signal": \{([\s\S]*?)case "space_monster":/,
)?.[1];
assert.ok(profileSignalBranch);
assert.match(profileSignalBranch, /startCombat/);
assert.doesNotMatch(profileSignalBranch, /startBossCombat/);

const gameManagementSource = readFileSync(
  path.join(root, "src/game/slices/gameManagement/gameManagementSlice.ts"),
  "utf8",
);
assert.doesNotMatch(gameManagementSource, /claimRunProfileArcReward/);
const playerVictorySource = readFileSync(
  path.join(root, "src/game/slices/combat/helpers/playerVictory.ts"),
  "utf8",
);
assert.match(playerVictorySource, /getRunProfileArcRewardPatch/);
const campaignProgressSource = readFileSync(
  path.join(root, "src/game/components/CampaignProgressPanel.tsx"),
  "utf8",
);
assert.match(campaignProgressSource, /runProfileArcTarget/);
assert.match(campaignProgressSource, /run_profile_arcs\.coordinates/);
assert.doesNotMatch(campaignProgressSource, /claimRunProfileArcReward/);
const galaxyObjectiveSource = readFileSync(
  path.join(root, "src/game/components/galaxyMapObjectives.ts"),
  "utf8",
);
assert.match(galaxyObjectiveSource, /runProfileArcTarget/);
assert.match(galaxyObjectiveSource, /"signal"/);

console.log("Run profile arc checks passed");
