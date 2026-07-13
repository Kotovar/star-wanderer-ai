import assert from "node:assert/strict";
import { getDeepScanChance } from "../src/game/signals/utils.ts";
import {
  DISTRESS_DEEP_SCAN_MIN_SCAN_RANGE,
  DISTRESS_GUARDED_APPROACH_FUEL_COST,
  DISTRESS_MEDICAL_SURVIVOR_JOINS_CHANCE,
  DISTRESS_PROTOCOL_MIN_AVAILABLE_POWER,
} from "../src/game/slices/locations/constants.ts";

assert.equal(DISTRESS_DEEP_SCAN_MIN_SCAN_RANGE, 3);
assert.equal(DISTRESS_PROTOCOL_MIN_AVAILABLE_POWER, 2);
assert.equal(DISTRESS_GUARDED_APPROACH_FUEL_COST, 2);
assert.equal(DISTRESS_MEDICAL_SURVIVOR_JOINS_CHANCE, 0.8);
assert.equal(getDeepScanChance(3, 0, 0), 34);
assert.equal(getDeepScanChance(3, 2, 1), 54);
assert.equal(getDeepScanChance(30, 10, 10), 95);

console.log("Distress signal checks passed");
