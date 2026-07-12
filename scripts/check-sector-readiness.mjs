import assert from "node:assert/strict";
import { getSectorReadiness } from "../src/game/progression/sectorReadiness.ts";

const state = {
  ship: {
    modules: [
      { type: "reactor", health: 100, maxHealth: 100, level: 1 },
      { type: "cockpit", health: 100, maxHealth: 100, level: 1 },
      { type: "engine", health: 100, maxHealth: 100, level: 1 },
      { type: "weaponbay", health: 100, maxHealth: 100, level: 1, weapons: [{ type: "laser" }] },
    ],
  },
  crew: [{ health: 100, level: 1 }, { health: 100, level: 1 }],
};

assert.deepEqual(getSectorReadiness(state, 1), {
  rating: 14,
  recommended: 12,
  needsWarning: false,
});
assert.equal(getSectorReadiness(state, 3).needsWarning, true);

console.log("Sector readiness checks passed");
