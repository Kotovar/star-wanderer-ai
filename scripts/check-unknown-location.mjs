import "./register-ts-loader.mjs";
import assert from "node:assert/strict";

const { approachUnknownLocation } = await import("../src/game/slices/locations/helpers/approachUnknownLocation.ts");

function approach(type, canScan = false, hostile = false) {
  const location = {
    id: "unknown", name: "Unknown", type, dominantRace: "human",
    ...(type === "space_monster" ? { enemyType: "space_monster", spaceMonsterType: "void_ray" } : {}),
  };
  const calls = [];
  const state = {
    gameMode: "unknown_ship", currentLocation: location,
    currentSector: { locations: [location, { id: "other" }] },
    currentCombat: null, activeExpedition: null, activeDive: null,
    discoveredEnemyCodexIds: [], raceReputation: { human: hostile ? -100 : 0 },
    canScanObject: () => canScan,
    startCombat: (...args) => calls.push(["combat", ...args]),
    startBossCombat: (...args) => calls.push(["boss", ...args]),
  };
  const set = (update) => Object.assign(state, typeof update === "function" ? update(state) : update);
  approachUnknownLocation(set, () => state);
  assert.equal(state.currentLocation.signalRevealed, true);
  assert.equal(state.currentSector.locations[0].signalRevealed, true);
  assert.equal(state.currentSector.locations[1].id, "other");
  return { state, calls, location };
}

for (const type of ["anomaly", "storm", "derelict_ship", "space_monster", "friendly_ship"]) {
  const { state, calls } = approach(type);
  assert.equal(state.gameMode, type);
  assert.deepEqual(calls, []);
  if (type === "space_monster") assert.deepEqual(state.discoveredEnemyCodexIds, ["space_monster:void_ray"]);
}
assert.equal(approach("friendly_ship", false, true).state.gameMode, "hostile_approach_warning");
for (const canScan of [true, false]) {
  const { calls, location } = approach("enemy", canScan);
  assert.deepEqual(calls, [["combat", location, !canScan]], "without a scanner enemies ambush the player");
}
const boss = approach("boss");
assert.deepEqual(boss.calls, [["boss", boss.location]]);
approachUnknownLocation(() => assert.fail("no update without a location"), () => ({ currentLocation: null }));

console.log("Unknown location approach checks passed");
