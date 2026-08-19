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
const {
  RACE_AGREEMENT_EFFECTS,
  getAcceptedContractTimeLimit,
  isRaceAgreementActive,
} = jiti(
  "../src/game/reputation/agreements.ts",
);
const { calculateFuelCost } = jiti(
  "../src/game/slices/travel/helpers/calculateFuelCost.ts",
);

const reputationAt = (value, raceId = "human") => ({
  human: raceId === "human" ? value : 0,
  synthetic: raceId === "synthetic" ? value : 0,
  xenosymbiont: raceId === "xenosymbiont" ? value : 0,
  krylorian: raceId === "krylorian" ? value : 0,
  voidborn: raceId === "voidborn" ? value : 0,
  crystalline: raceId === "crystalline" ? value : 0,
});

assert.equal(
  isRaceAgreementActive(reputationAt(10), "human"),
  false,
  "neutral reputation must not enable an agreement",
);
assert.equal(
  isRaceAgreementActive(reputationAt(11), "human"),
  true,
  "friendly reputation must enable an agreement",
);
assert.equal(
  isRaceAgreementActive(reputationAt(51), "human"),
  true,
  "allied reputation must keep the agreement enabled",
);
assert.equal(
  RACE_AGREEMENT_EFFECTS.human.deadlineTurns,
  2,
  "the human agreement must add two turns to timed contracts",
);
assert.equal(
  RACE_AGREEMENT_EFFECTS.synthetic.researchMultiplier,
  1.1,
  "the synthetic agreement must add ten percent research output",
);
assert.equal(
  RACE_AGREEMENT_EFFECTS.xenosymbiont.healingCostMultiplier,
  0.85,
  "the xenosymbiont agreement must reduce treatment cost by fifteen percent",
);
assert.equal(
  RACE_AGREEMENT_EFFECTS.krylorian.retreatChanceBonus,
  0.05,
  "the krylorian agreement must add five retreat percentage points",
);
assert.equal(
  RACE_AGREEMENT_EFFECTS.voidborn.fuelMultiplier,
  0.92,
  "the voidborn agreement must reduce fuel consumption by eight percent",
);
assert.equal(
  RACE_AGREEMENT_EFFECTS.crystalline.artifactFindChanceBonus,
  0.01,
  "the crystalline agreement must add one artifact-find percentage point",
);
assert.equal(
  getAcceptedContractTimeLimit(8, reputationAt(10)),
  8,
  "a neutral human reputation must not change a contract deadline",
);
assert.equal(
  getAcceptedContractTimeLimit(8, reputationAt(11)),
  10,
  "the human agreement must add two turns at contract acceptance",
);
assert.equal(
  getAcceptedContractTimeLimit(undefined, reputationAt(11)),
  undefined,
  "contracts without a deadline must remain untimed",
);

const { setUiState } = await import("./register-ui-loader.mjs");
setUiState({ crew: [], ship: { modules: [] } });
const { calculateResearchOutput } = await import(
  "../src/game/slices/research/helpers/researchHelpers.ts"
);
const { rollArtifactFind } = await import(
  "../src/game/slices/artifacts/helpers/tryFindArtifact.ts"
);
const { ANCIENT_ARTIFACTS } = await import(
  "../src/game/constants/artifacts.ts"
);

assert.equal(
  calculateResearchOutput({
    ship: {
      modules: [
        {
          id: 10,
          type: "lab",
          health: 100,
          maxHealth: 100,
          researchOutput: 10,
        },
      ],
    },
    crew: [],
    research: { researchedTechs: [] },
    activeEffects: [],
    raceReputation: reputationAt(11, "synthetic"),
  }).totalOutput,
  11,
  "the synthetic agreement must increase final research output by ten percent",
);

const originalRandom = Math.random;
try {
  Math.random = () => 0.025;
  assert.notEqual(
    rollArtifactFind({
      currentSector: { tier: 1 },
      artifacts: ANCIENT_ARTIFACTS.map((artifact) => ({
        ...artifact,
        effect: { ...artifact.effect },
      })),
      crew: [],
      research: { researchedTechs: [], resources: {} },
      activeEffects: [],
      raceReputation: reputationAt(11, "crystalline"),
    }),
    null,
    "the crystalline agreement must find an artifact at a three-percent roll",
  );
} finally {
  Math.random = originalRandom;
}

const { calculateHealCost } = jiti(
  "../src/game/slices/services/helpers/calculateHealCost.ts",
);
assert.equal(
  calculateHealCost({
    crew: [{ health: 50, maxHealth: 100 }],
    raceReputation: reputationAt(11, "xenosymbiont"),
  }).cost,
  34,
  "the xenosymbiont agreement must reduce a 40-credit treatment to 34 credits",
);

const { calculateRetreatChance } = jiti(
  "../src/game/slices/combat/helpers/retreat.ts",
);
assert.equal(
  calculateRetreatChance(undefined, reputationAt(11, "krylorian")),
  0.55,
  "the krylorian agreement must raise the base retreat chance from 50 to 55 percent",
);

const sector = (id, tier, mapAngle) => ({
  id,
  tier,
  mapAngle,
  star: { type: "yellow" },
  locations: [],
});
const homeSector = sector(1, 1, 0);
const distantSector = sector(2, 3, Math.PI);
assert.equal(
  calculateFuelCost(
    {
      galaxy: { sectors: [homeSector, distantSector] },
      currentSector: homeSector,
      traveling: null,
      crew: [],
      ship: { modules: [], fuel: 100, maxFuel: 100 },
      artifacts: [],
      activeEffects: [],
      research: { researchedTechs: [], resources: {} },
      raceReputation: reputationAt(11, "voidborn"),
    },
    distantSector.id,
    false,
    false,
    false,
    true,
  ).fuelCost,
  78,
  "the voidborn agreement must reduce an 84-fuel long jump to 78 fuel",
);

console.log("Race agreement definition checks passed");
