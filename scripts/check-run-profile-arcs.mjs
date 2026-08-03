import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";

const require = createRequire(import.meta.url);
const scriptPath = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(scriptPath), "..");
const jiti = require("jiti")(scriptPath, {
  alias: { "@": path.join(root, "src") },
});

const { getRunProfileArcProgress } = jiti(
  "../src/game/galaxy/runProfileArcs.ts",
);
const { claimRunProfileArcReward } = jiti(
  "../src/game/slices/gameManagement/helpers/claimRunProfileArcReward.ts",
);
const { loadWithMigrations } = jiti("../src/game/saves/migrations.ts");

const makeSectors = (type, count, visited = true) => [
  {
    id: 1,
    locations: Array.from({ length: count }, (_, index) => ({
      id: `${type}-${index}`,
      type,
      visited,
    })),
  },
];

assert.equal(
  getRunProfileArcProgress("ancient_echo", makeSectors("anomaly", 1), [])
    .reachedMilestones,
  1,
);
assert.equal(
  getRunProfileArcProgress("war_spiral", makeSectors("enemy", 3), [])
    .reachedMilestones,
  2,
);
const fading = getRunProfileArcProgress(
  "broken_trade_lanes",
  makeSectors("derelict_ship", 5),
  [],
);
assert.deepEqual(fading.reward, { rare_minerals: 5, tech_salvage: 3 });
assert.equal(fading.isComplete, true);
assert.equal(
  getRunProfileArcProgress(null, makeSectors("anomaly", 5), []),
  null,
);

let saves = 0;
const logs = [];
const state = {
  runProfileId: "war_spiral",
  runProfileArcRewardClaimed: false,
  galaxy: { sectors: makeSectors("enemy", 5) },
  completedLocations: [],
  research: { resources: {} },
  addLog: (...args) => logs.push(args),
  saveGame: () => {
    saves += 1;
  },
};
const set = (updater) => {
  const draft = {
    ...state,
    galaxy: {
      ...state.galaxy,
      sectors: state.galaxy.sectors.map((sector) => ({
        ...sector,
        locations: sector.locations.map((location) => ({ ...location })),
      })),
    },
    completedLocations: [...state.completedLocations],
    research: { ...state.research, resources: { ...state.research.resources } },
  };
  Object.assign(state, updater(draft));
};
const get = () => state;

claimRunProfileArcReward(set, get);
claimRunProfileArcReward(set, get);

assert.deepEqual(state.research.resources, {
  alien_biology: 5,
  tech_salvage: 3,
});
assert.equal(state.runProfileArcRewardClaimed, true);
assert.equal(logs.length, 1);
assert.equal(logs[0][1], "info");
assert.equal(saves, 1);

const migrated = loadWithMigrations(
  JSON.stringify({ version: 18, state: {} }),
);
assert.equal(migrated?.runProfileArcRewardClaimed, false);

const campaignProgressPanel = fs.readFileSync(
  path.join(root, "src/game/components/CampaignProgressPanel.tsx"),
  "utf8",
);
assert.match(campaignProgressPanel, /getRunProfileArcProgress/);
assert.match(campaignProgressPanel, /claimRunProfileArcReward/);

console.log("Run profile arc checks passed");
