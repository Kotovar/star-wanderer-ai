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
const { getFuelTrapRisk } = jiti("../src/game/galaxy/fuelTrapRisk.ts");

assert.deepEqual(
  getFuelTrapRisk(3, [
    { hasStation: false, fuelCost: 2 },
    { hasStation: true, fuelCost: 4 },
  ]),
  { remainingFuel: 3, minimumFuel: 4 },
  "warn when a cheaper non-station jump exists but reaching a station is unaffordable",
);

console.log("Fuel trap warning checks passed");
