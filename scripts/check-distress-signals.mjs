import assert from "node:assert/strict";
import * as signalUtils from "../src/game/signals/utils.ts";
import {
  DISTRESS_DEEP_SCAN_MIN_SCAN_RANGE,
  DISTRESS_GUARDED_APPROACH_FUEL_COST,
  DISTRESS_MEDICAL_SURVIVOR_JOINS_CHANCE,
  DISTRESS_PROTOCOL_MIN_AVAILABLE_POWER,
} from "../src/game/slices/locations/constants.ts";

const { getDeepScanChance, getDeepScanPatch, getSurvivorSignalLoot } = signalUtils;

assert.equal(DISTRESS_DEEP_SCAN_MIN_SCAN_RANGE, 3);
assert.equal(DISTRESS_PROTOCOL_MIN_AVAILABLE_POWER, 2);
assert.equal(DISTRESS_GUARDED_APPROACH_FUEL_COST, 2);
assert.equal(DISTRESS_MEDICAL_SURVIVOR_JOINS_CHANCE, 0.8);
assert.equal(getDeepScanChance(3, 0, 0), 34);
assert.equal(getDeepScanChance(3, 2, 1), 54);
assert.equal(getDeepScanChance(30, 10, 10), 95);
assert.deepEqual(
  getDeepScanPatch(),
  { signalDeepScanUsed: true, signalDeepScanFailed: true },
  "a failed deep scan remains visibly distinguishable from an unscanned signal",
);
assert.deepEqual(
  getDeepScanPatch("survivors"),
  {
    signalDeepScanUsed: true,
    signalType: "survivors",
    signalRevealed: true,
    signalRevealChecked: true,
  },
  "a decoded signal retains its revealed outcome",
);
assert.deepEqual(
  getSurvivorSignalLoot(180, 2, "Каро Медина"),
  { credits: 180, alienBiology: 2, survivorName: "Каро Медина" },
  "survivor rewards retain every received item for the resolved signal panel",
);

console.log("Distress signal checks passed");
