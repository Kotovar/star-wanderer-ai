import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";

const require = createRequire(import.meta.url);
const scriptPath = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(scriptPath), "..");
const jiti = require("jiti")(scriptPath, {
  alias: { "@": path.join(root, "src") },
});

const nebulae = jiti("../src/game/galaxy/nebulae.ts");
const { GLOBAL_CRISES, pickScheduledCrisis } = jiti(
  "../src/game/constants/globalCrises.ts",
);
const nebulaFront = jiti("../src/game/crises/nebulaFront.ts");

const {
  generateNebulaFrontNebulae,
  getSectorMapPoint,
} = nebulae;
const {
  canStartNebulaFront,
  getNebulaFrontDispersal,
  getNebulaFrontProgress,
  NEBULA_FRONT_STABILIZER_COST,
} = nebulaFront;

assert.equal(
  typeof generateNebulaFrontNebulae,
  "function",
  "the nebula-front crisis must generate its three additional nebulae",
);
assert.equal(
  typeof canStartNebulaFront,
  "function",
  "the crisis must expose its one-time eligibility rule",
);
assert.equal(
  typeof getNebulaFrontProgress,
  "function",
  "the crisis must expose player-visible dispersion progress",
);
assert.equal(
  typeof getNebulaFrontDispersal,
  "function",
  "the crisis must validate one station-built stabilizer",
);
assert.deepEqual(
  NEBULA_FRONT_STABILIZER_COST,
  { quantum_crystals: 10, energy_samples: 25, void_membrane: 3 },
  "one stabilizer must require the agreed deep-dive materials",
);

const start = {
  id: 0,
  tier: 1,
  mapAngle: Math.PI,
  locations: [],
  star: { type: "red_dwarf" },
};
const boss = {
  id: 99,
  tier: 4,
  mapAngle: 0,
  locations: [{ id: "void-oracle", bossId: "void_oracle" }],
  star: { type: "blackhole" },
};
const candidates = [
  [1, 2, 0],
  [2, 2, Math.PI / 3],
  [3, 2, (Math.PI * 2) / 3],
  [4, 3, Math.PI],
  [5, 3, (Math.PI * 4) / 3],
  [6, 3, (Math.PI * 5) / 3],
].map(([id, tier, mapAngle]) => ({
  id,
  tier,
  mapAngle,
  locations: [],
  star: { type: "red_dwarf" },
}));
const sectors = [start, ...candidates, boss];
const existingNebulae = [{ id: "nebula-1", x: 0.145, y: 0, radius: 0.16 }];
const frontNebulae = generateNebulaFrontNebulae(sectors, existingNebulae);

assert.equal(
  frontNebulae.length,
  3,
  "one nebula-front crisis must add exactly three nebulae",
);
assert.equal(
  new Set(frontNebulae.map((nebula) => nebula.id)).size,
  3,
  "each crisis nebula must have its own persistent ID",
);
for (const nebula of frontNebulae) {
  for (const protectedSector of [start, boss]) {
    const point = getSectorMapPoint(protectedSector);
    assert.ok(
      (point.x - nebula.x) ** 2 + (point.y - nebula.y) ** 2 > nebula.radius ** 2,
      `crisis nebula ${nebula.id} must not cover protected sector ${protectedSector.id}`,
    );
  }
  for (const existing of existingNebulae) {
    assert.ok(
      Math.hypot(nebula.x - existing.x, nebula.y - existing.y) >
        nebula.radius + existing.radius,
      `crisis nebula ${nebula.id} must not overlap an existing nebula`,
    );
  }
}

for (const [index, nebula] of frontNebulae.entries()) {
  for (const other of frontNebulae.slice(index + 1)) {
    assert.ok(
      Math.hypot(nebula.x - other.x, nebula.y - other.y) >
        nebula.radius + other.radius,
      "crisis nebulae must not overlap each other",
    );
  }
}

const activeCrisis = {
  id: "nebula_front",
  turnsRemaining: 12,
  data: { nebulaIds: ["front-1", "front-2", "front-3"] },
};
const remainingNebulae = [
  { id: "front-1", x: 0, y: 0, radius: 0.1 },
  { id: "front-3", x: 0.3, y: 0, radius: 0.1 },
];

assert.deepEqual(
  getNebulaFrontProgress(activeCrisis, remainingNebulae),
  { total: 3, dispersed: 1, remaining: 2 },
  "removed crisis nebulae must count as permanently dispersed",
);
assert.equal(
  getNebulaFrontDispersal(
    activeCrisis,
    remainingNebulae,
    { quantum_crystals: 10, energy_samples: 25, void_membrane: 3 },
    true,
  ),
  "front-1",
  "one funded stabilizer must select one remaining crisis nebula",
);
assert.equal(
  getNebulaFrontDispersal(
    activeCrisis,
    remainingNebulae,
    { quantum_crystals: 10, energy_samples: 25, void_membrane: 2 },
    true,
  ),
  null,
  "a stabilizer must not activate without membranes from a deep gas-giant dive",
);
assert.equal(
  getNebulaFrontDispersal(
    activeCrisis,
    remainingNebulae,
    { quantum_crystals: 10, energy_samples: 24, void_membrane: 3 },
    true,
  ),
  null,
  "a stabilizer must not activate without all required rare materials",
);
assert.equal(
  getNebulaFrontDispersal(
    activeCrisis,
    remainingNebulae,
    { quantum_crystals: 1, energy_samples: 4 },
    false,
  ),
  null,
  "non-research stations must not prepare a stabilizer target",
);
assert.equal(
  getNebulaFrontProgress(null, remainingNebulae),
  null,
  "progress must disappear after the active crisis ends",
);
assert.equal(canStartNebulaFront(1, []), false, "the front must not trigger in tier 1");
assert.equal(canStartNebulaFront(2, []), true, "the front may trigger from tier 2 onward");
assert.equal(
  canStartNebulaFront(3, ["nebula_front"]),
  false,
  "the front must not repeat after the player has encountered it",
);

const tierOneCrisisState = {
  credits: 0,
  ship: { tradeGoods: [], modules: [], fuel: 100 },
  crew: [],
  currentSector: { tier: 1 },
  discoveredCrisisIds: [],
};
assert.equal(
  typeof pickScheduledCrisis,
  "function",
  "scheduled crisis selection must enforce the front's tier gate",
);
assert.notEqual(
  pickScheduledCrisis(tierOneCrisisState, "nebula_front").id,
  "nebula_front",
  "a stale or opening scheduled front must not bypass the tier-2 gate",
);
assert.equal(
  pickScheduledCrisis(
    { ...tierOneCrisisState, currentSector: { tier: 2 } },
    "nebula_front",
  ).id,
  "nebula_front",
  "an eligible scheduled front must still start after tier 2",
);

const nebulaFrontCrisis = GLOBAL_CRISES.find(
  (crisis) => crisis.id === "nebula_front",
);
assert.ok(
  nebulaFrontCrisis,
  "the nebula-front crisis must be registered in the global crisis lifecycle",
);

const crisisLogs = [];
let crisisState = {
  galaxy: { sectors, nebulae: existingNebulae },
  currentSector: candidates[0],
  discoveredCrisisIds: [],
  addLog: (message, type) => crisisLogs.push({ message, type }),
};
const setCrisisState = (patch) => {
  const next = typeof patch === "function" ? patch(crisisState) : patch;
  crisisState = { ...crisisState, ...next };
};
const createdData = nebulaFrontCrisis.onStartEffect(
  setCrisisState,
  () => crisisState,
);

assert.equal(
  createdData?.nebulaIds?.length,
  3,
  "starting the crisis must remember the three generated nebula IDs",
);
assert.equal(
  crisisState.galaxy.nebulae.length,
  4,
  "starting the crisis must append three nebulae to the existing map",
);
nebulaFrontCrisis.onEndEffect?.(
  setCrisisState,
  () => crisisState,
  { id: "nebula_front", turnsRemaining: 1, data: createdData },
);
assert.equal(
  crisisState.galaxy.nebulae.length,
  4,
  "ending the crisis must leave unresolved nebulae on the map",
);

console.log("Nebula-front crisis checks passed");
