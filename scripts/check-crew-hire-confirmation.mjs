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
const { getOxygenHireWarning } = jiti(
  "../src/game/slices/crewManagement/utils/hireCrew.ts",
);

const crew = Array.from({ length: 5 }, () => ({ race: "human" }));
const state = {
  crew,
  getOxygenCapacity: () => 5,
};

assert.deepEqual(
  getOxygenHireWarning(state, "human"),
  { status: "oxygen_confirmation_required", needed: 6, capacity: 5 },
  "An organic hire over capacity must require explicit confirmation",
);
assert.equal(
  getOxygenHireWarning(state, "synthetic"),
  null,
  "An oxygen-immune hire must not require confirmation",
);

console.log("Crew hire confirmation checks passed");
