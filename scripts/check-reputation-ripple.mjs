import assert from "node:assert/strict";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { calculateReputationRippleEffects } from "../src/game/reputation/ripple.ts";

const require = createRequire(import.meta.url);
const scriptPath = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(scriptPath), "..");
const jiti = require("jiti")(scriptPath, { alias: { "@": path.join(root, "src") } });
const { getContractReputationImpact } = jiti("../src/game/reputation/utils.ts");

const relations = { ally: 15, rival: -20, neutral: 0 };

assert.deepEqual(
  calculateReputationRippleEffects(relations, "primary", 10),
  [
    { id: "ally", change: 3 },
    { id: "rival", change: -4 },
  ],
);
assert.deepEqual(
  calculateReputationRippleEffects(relations, "primary", -10),
  [
    { id: "ally", change: -3 },
    { id: "rival", change: 4 },
  ],
);

assert.deepEqual(
  getContractReputationImpact({
    sourceDominantRace: "human",
    reputationReward: 4,
  }),
  [
    { raceId: "human", change: 4 },
    { raceId: "synthetic", change: -1 },
    { raceId: "crystalline", change: 1 },
  ],
  "friendly bounty reputation must keep the normal ripple with +4 primary rep",
);

console.log("Reputation ripple checks passed");
