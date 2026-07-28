import assert from "node:assert/strict";
import {
  getCrewRelationPairs,
  rollCrewRelationEvent,
} from "../src/game/crew/relationEvents.ts";

const human1 = { id: 1, race: "human", health: 100, name: "H1" };
const synthetic1 = { id: 2, race: "synthetic", health: 100, name: "S1" };
const krylorian1 = { id: 3, race: "krylorian", health: 100, name: "K1" };
const humanDead = { id: 4, race: "human", health: 0, name: "H2" };
const syntheticDead = { id: 6, race: "synthetic", health: 0, name: "S2" };
const crystalline1 = { id: 5, race: "crystalline", health: 100, name: "C1" };

// getCrewRelationPairs: skips dead crew, same-race pairs, and zero relations
// (human/krylorian relation is 0 in constants/races.ts)
const pairs = getCrewRelationPairs([human1, synthetic1, krylorian1, humanDead]);
assert.equal(pairs.length, 2);
assert.deepEqual(
  pairs.map((p) => [p.a.id, p.b.id, p.relation]),
  [
    [1, 2, -10], // human -> synthetic
    [2, 3, -15], // synthetic -> krylorian
  ],
);

// rollCrewRelationEvent: negative relation -> conflict, first eligible pair, rng always clears
const conflict = rollCrewRelationEvent([human1, synthetic1], 0.001, () => 0);
assert.equal(conflict?.type, "conflict");
assert.equal(conflict?.a.id, 1);
assert.equal(conflict?.b.id, 2);

// positive relation -> bonding
const bonding = rollCrewRelationEvent([human1, crystalline1], 0.001, () => 0);
assert.equal(bonding?.type, "bonding");

// rng never clears the chance -> no event
assert.equal(rollCrewRelationEvent([human1, synthetic1], 0.001, () => 1), null);

// dead crew member is excluded -> no eligible pair -> no event regardless of rng
assert.equal(
  rollCrewRelationEvent([human1, syntheticDead], 0.001, () => 0),
  null,
);

// chance scales with |relation|: for the -10 human/synthetic pair, chancePerPoint
// 0.001 gives a 0.01 threshold. 0.0095 clears it, 0.02 doesn't.
assert.equal(
  rollCrewRelationEvent([human1, synthetic1], 0.001, () => 0.0095)?.type,
  "conflict",
);
assert.equal(
  rollCrewRelationEvent([human1, synthetic1], 0.001, () => 0.02),
  null,
);

console.log("Crew relation event checks passed");
