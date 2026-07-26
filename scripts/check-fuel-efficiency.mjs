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
const { RESEARCH_TREE } = jiti("../src/game/constants/research/index.ts");
const {
  MAX_FUEL_EFFICIENCY_BONUS,
  getFuelEfficiencyTechBonus,
} = jiti("../src/game/research/utils.ts");

const allResearch = { researchedTechs: Object.keys(RESEARCH_TREE) };

assert.equal(MAX_FUEL_EFFICIENCY_BONUS, 0.5);
assert.equal(
  getFuelEfficiencyTechBonus(allResearch),
  0.5,
  "fuel technologies may not reduce consumption by more than 50%",
);
assert.equal(
  getFuelEfficiencyTechBonus({ researchedTechs: ["warp_drive"] }),
  0,
  "warp drive remains a separate free-travel effect",
);

console.log("Fuel efficiency checks passed");
