import assert from "node:assert/strict";
import {
  hasWarpTravel,
  shouldPhaseShieldAbsorb,
} from "../src/game/research/specialAbilities.ts";

assert.equal(hasWarpTravel(["warp_drive"]), true);
assert.equal(hasWarpTravel(["phase_shield"]), false);
assert.equal(shouldPhaseShieldAbsorb(["phase_shield"], 20, 100, 0.19), true);
assert.equal(shouldPhaseShieldAbsorb(["phase_shield"], 19, 100, 0), false);
assert.equal(shouldPhaseShieldAbsorb([], 100, 100, 0), false);
assert.equal(shouldPhaseShieldAbsorb(["phase_shield"], 100, 100, 0.2), false);

console.log("Research special ability checks passed");
