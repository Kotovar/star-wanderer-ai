import assert from "node:assert/strict";
import { calculateReputationRippleEffects } from "../src/game/reputation/ripple.ts";

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

console.log("Reputation ripple checks passed");
