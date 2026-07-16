import assert from "node:assert/strict";
import {
  EXPEDITION_RUINS_MAX_DEPTH,
  getRuinsDepthDamage,
  getRuinsDepthRewardMultiplier,
} from "../src/game/slices/locations/helpers/expedition/constants.ts";

assert.equal(EXPEDITION_RUINS_MAX_DEPTH, 2);
assert.equal(getRuinsDepthRewardMultiplier(0), 1);
assert.equal(getRuinsDepthRewardMultiplier(1), 2);
assert.equal(getRuinsDepthRewardMultiplier(2), 3);
assert.equal(getRuinsDepthDamage(0), 0);
assert.equal(getRuinsDepthDamage(1), 8);
assert.equal(getRuinsDepthDamage(2), 16);

console.log("Expedition ruins checks passed");
