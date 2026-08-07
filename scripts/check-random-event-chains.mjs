import assert from "node:assert/strict";
import {
  isRandomEventConsequenceDue,
  RANDOM_EVENT_CONSEQUENCE_DELAY,
  scheduleRandomEventConsequence,
} from "../src/game/events/randomEventChains.ts";
import {
  canBeAffectedByBiohazard,
  isCrewImmuneToBiohazard,
} from "../src/game/events/biohazard.ts";


const scheduled = scheduleRandomEventConsequence("capsule", "specialist", 12);

assert.deepEqual(scheduled, {
  eventType: "capsule",
  choice: "specialist",
  triggerTurn: 12 + RANDOM_EVENT_CONSEQUENCE_DELAY,
});
assert.equal(isRandomEventConsequenceDue(scheduled, 14), false);
assert.equal(isRandomEventConsequenceDue(scheduled, 15), true);

const biohazardCrewMember = (race, health = 100, happiness = 100) => ({
  id: race === "synthetic" ? 1 : 2,
  name: race,
  race,
  profession: "pilot",
  moduleId: 1,
  health,
  maxHealth: 100,
  happiness,
  maxHappiness: 100,
  traits: [],
});
assert.equal(
  canBeAffectedByBiohazard(biohazardCrewMember("synthetic")),
  false,
  "immune crew ignores biohazard effects",
);
assert.equal(
  canBeAffectedByBiohazard(biohazardCrewMember("human")),
  true,
  "organic crew remains vulnerable to biohazards",
);
assert.equal(
  canBeAffectedByBiohazard(biohazardCrewMember("human", 0)),
  false,
  "dead crew cannot be affected by biohazards",
);
assert.equal(
  isCrewImmuneToBiohazard([biohazardCrewMember("synthetic")]),
  true,
  "fully immune crews skip the biohazard consequence",
);
assert.equal(
  isCrewImmuneToBiohazard([
    biohazardCrewMember("synthetic"),
    biohazardCrewMember("human"),
  ]),
  false,
  "one vulnerable crew member keeps the biohazard chain active",
);

console.log("Random event chain checks passed");
