import assert from "node:assert/strict";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const scriptPath = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(scriptPath), "..");
const jiti = require("jiti")(scriptPath, {
  alias: { "@": path.join(root, "src") },
});

const { generatePlanetContracts } = jiti(
  "../src/game/contracts/generatePlanetContracts.ts",
);
const { loadWithMigrations } = jiti("../src/game/saves/migrations.ts");
const {
  getFactionDeliveryContext,
  getFactionDeliveryReward,
  getValidPendingContractDecision,
} = jiti("../src/game/contracts/factionDelivery.ts");

const withRandomSequence = (values, callback) => {
  const originalRandom = Math.random;
  let index = 0;
  Math.random = () => values[index++] ?? 0;
  try {
    return callback();
  } finally {
    Math.random = originalRandom;
  }
};

const humanSource = {
  id: 1,
  name: "Human source",
  tier: 1,
  locations: [
    {
      id: "human-source",
      type: "planet",
      name: "Human source",
      planetType: "Пустынная",
      dominantRace: "human",
    },
  ],
};

const syntheticTarget = {
  id: 2,
  name: "Synthetic target",
  tier: 1,
  locations: [
    {
      id: "synthetic-target",
      type: "planet",
      name: "Synthetic target",
      planetType: "Ледяная",
      dominantRace: "synthetic",
    },
  ],
};

const humanTarget = {
  ...syntheticTarget,
  id: 3,
  locations: [
    {
      ...syntheticTarget.locations[0],
      id: "human-target",
      dominantRace: "human",
    },
  ],
};

const stationTarget = {
  ...syntheticTarget,
  id: 4,
  locations: [
    {
      id: "station-target",
      type: "station",
      name: "Station target",
    },
  ],
};

const generateDelivery = (target, decisionRoll, context) =>
  withRandomSequence(
    [0, 0.99, 0.21, 0, 0, 0, decisionRoll, 0, 0],
    () =>
      generatePlanetContracts(
        "Пустынная",
        humanSource,
        "human-source",
        0,
        [humanSource, target],
        "human",
        null,
        context,
      ).find((contract) => contract.type === "delivery"),
  );

assert.equal(getFactionDeliveryReward(999), 649);
assert.equal(getFactionDeliveryContext("fuel"), "relief");
assert.equal(getFactionDeliveryContext("spares"), "relief");
assert.equal(getFactionDeliveryContext("construction_materials"), "reconstruction");
assert.equal(getFactionDeliveryContext("scientific_equipment"), "research_access");
assert.equal(getFactionDeliveryContext("diplomatic_cargo"), "diplomatic_claim");

assert.deepEqual(
  generateDelivery(syntheticTarget, 0.34, {
    canOfferCombat: true,
    allowFrontier: false,
  })?.factionDelivery,
  { localRace: "synthetic", context: "relief" },
  "eligible cross-faction planet delivery should reveal a faction decision",
);
assert.equal(
  generateDelivery(syntheticTarget, 0.35, {
    canOfferCombat: true,
    allowFrontier: false,
  })?.factionDelivery,
  undefined,
  "the 35% boundary must not create a faction decision",
);
assert.equal(
  generateDelivery(humanTarget, 0, {
    canOfferCombat: true,
    allowFrontier: false,
  })?.factionDelivery,
  undefined,
  "same-race delivery must stay ordinary",
);
assert.equal(
  generateDelivery(stationTarget, 0, {
    canOfferCombat: true,
    allowFrontier: false,
  })?.factionDelivery,
  undefined,
  "station delivery must stay ordinary",
);
assert.equal(
  generateDelivery(syntheticTarget, 0, {
    canOfferCombat: true,
    allowFrontier: true,
  })?.factionDelivery,
  undefined,
  "Frontier delivery must not receive a faction decision",
);

const legacy = loadWithMigrations(
  JSON.stringify({
    version: 25,
    state: { ship: { modules: [] }, activeContracts: [] },
  }),
);
assert.equal(
  legacy?.pendingContractDecision,
  null,
  "version-25 saves must initialize the pending faction decision",
);
assert.deepEqual(
  getValidPendingContractDecision(
    { contractId: "valid" },
    [
      {
        id: "valid",
        factionDelivery: { localRace: "synthetic", context: "relief" },
      },
    ],
  ),
  { contractId: "valid" },
);
assert.equal(
  getValidPendingContractDecision({ contractId: "stale" }, []),
  null,
  "a missing delivery must not reopen a stale decision",
);

console.log("faction delivery choice checks passed");
