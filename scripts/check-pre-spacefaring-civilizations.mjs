import assert from "node:assert/strict";
import "./register-ts-loader.mjs";

const {
  PRE_SPACEFARING_CIVILIZATIONS,
  PRE_SPACEFARING_SETTLEMENT_TILE_INDICES,
} = await import("../src/game/constants/preSpacefaringCivilizations.ts");
const { getPreSpacefaringSettlementCandidate } = await import(
  "../src/game/slices/locations/helpers/expedition/preSpacefaringSettlement.ts",
);

const planet = (id, over = {}) => ({
  id,
  type: "planet",
  isEmpty: true,
  explored: true,
  ...over,
});

assert.equal(PRE_SPACEFARING_CIVILIZATIONS.length, 4);
assert.deepEqual(
  PRE_SPACEFARING_CIVILIZATIONS.map((entry) => entry.development).sort(),
  ["agrarian", "industrial", "modern", "primitive"],
);

const probes = Array.from({ length: 250 }, (_, index) =>
  planet("civilization-probe-" + index),
);
const candidatePlanet = probes.find(
  (entry) => getPreSpacefaringSettlementCandidate(entry, false) !== null,
);
assert.ok(candidatePlanet);

const first = getPreSpacefaringSettlementCandidate(candidatePlanet, false);
const second = getPreSpacefaringSettlementCandidate(candidatePlanet, false);
assert.deepEqual(first, second);
assert.ok(first);
assert.ok(PRE_SPACEFARING_SETTLEMENT_TILE_INDICES.includes(first.tileIndex));
assert.equal(getPreSpacefaringSettlementCandidate(candidatePlanet, true), null);
assert.equal(
  getPreSpacefaringSettlementCandidate(
    planet("not-empty", { isEmpty: false }),
    false,
  ),
  null,
);
assert.equal(
  getPreSpacefaringSettlementCandidate(
    planet("not-explored", { explored: false }),
    false,
  ),
  null,
);
assert.equal(
  getPreSpacefaringSettlementCandidate(
    planet("already-contacted", {
      preSpacefaringContact: {
        civilizationId: "river_clans",
        development: "primitive",
        step: 0,
      },
    }),
    false,
  ),
  null,
);

console.log("Pre-spacefaring civilization checks passed");
