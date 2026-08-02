import assert from "node:assert/strict";
import {
  DERELICT_APPROACH_CONFIG,
  DERELICT_RISK_CHANCE,
} from "../src/game/slices/locations/constants.ts";

assert.deepEqual(Object.keys(DERELICT_APPROACH_CONFIG), [
  "boarding",
  "engineering",
  "archive",
]);
assert.equal(DERELICT_APPROACH_CONFIG.boarding.scoutDamage, 5);
assert.equal(DERELICT_APPROACH_CONFIG.engineering.sparesMultiplier, 1.5);
assert.equal(DERELICT_APPROACH_CONFIG.archive.scannerDamage, 10);
assert.equal(DERELICT_RISK_CHANCE, 0.25);

console.log("Derelict approach checks passed");
