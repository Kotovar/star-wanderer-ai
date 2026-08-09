import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const require = createRequire(import.meta.url);
const scriptPath = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(scriptPath), "..");
const jiti = require("jiti")(scriptPath, {
  alias: { "@": path.join(root, "src") },
});
const { getFuelRecoveryNeed, getFuelTrapRisk } = jiti(
  "../src/game/galaxy/fuelTrapRisk.ts",
);

assert.deepEqual(
  getFuelTrapRisk(3, [
    { hasStation: false, fuelCost: 2 },
    { hasStation: true, fuelCost: 4 },
  ]),
  { remainingFuel: 3, minimumFuel: 4 },
  "warn when a cheaper non-station jump exists but reaching a station is unaffordable",
);

const recoveryOptions = [
  { hasStation: true, fuelCost: 3, known: false, accessible: true },
  { hasStation: true, fuelCost: 4, known: true, accessible: false },
  { hasStation: false, fuelCost: 2, known: true, accessible: true },
  { hasStation: true, fuelCost: 5, known: true, accessible: true },
];
assert.deepEqual(
  getFuelRecoveryNeed(2, 8, recoveryOptions),
  { targetFuel: 5 },
  "recovery targets the nearest known accessible station",
);
assert.equal(
  getFuelRecoveryNeed(5, 8, recoveryOptions),
  null,
  "recovery stops once the station is reachable",
);
assert.equal(
  getFuelRecoveryNeed(2, 4, recoveryOptions),
  null,
  "recovery never requests more fuel than the tanks can hold",
);

const eventPanelsSource = readFileSync(
  new URL("../src/game/components/EventPanels.tsx", import.meta.url),
  "utf8",
);
assert.match(
  eventPanelsSource,
  /prioritizeFuelSynthesis\(fuelRecoveryTarget\)/,
  "fuel warning must expose the automation action",
);

console.log("Fuel trap warning checks passed");
