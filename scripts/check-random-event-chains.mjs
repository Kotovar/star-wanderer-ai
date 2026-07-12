import assert from "node:assert/strict";
import {
  isRandomEventConsequenceDue,
  RANDOM_EVENT_CONSEQUENCE_DELAY,
  scheduleRandomEventConsequence,
} from "../src/game/events/randomEventChains.ts";

const scheduled = scheduleRandomEventConsequence("capsule", "specialist", 12);

assert.deepEqual(scheduled, {
  eventType: "capsule",
  choice: "specialist",
  triggerTurn: 12 + RANDOM_EVENT_CONSEQUENCE_DELAY,
});
assert.equal(isRandomEventConsequenceDue(scheduled, 14), false);
assert.equal(isRandomEventConsequenceDue(scheduled, 15), true);

console.log("Random event chain checks passed");
