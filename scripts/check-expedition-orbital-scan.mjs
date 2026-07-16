import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";

const require = createRequire(import.meta.url);
const scriptPath = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(scriptPath), "..");
const jiti = require("jiti")(scriptPath, {
  alias: { "@": path.join(root, "src") },
});
const { scanExpeditionTile } = jiti(
  "../src/game/slices/locations/helpers/expedition/scanExpeditionTile.ts",
);

const grid = Array.from({ length: 25 }, (_, index) => ({
  type: "market",
  revealed: index === 12,
  x: index % 5,
  y: Math.floor(index / 5),
}));
const state = {
  activeExpedition: {
    finished: false,
    activeRuinsEvent: null,
    scansRemaining: 1,
    orbitalScanAvailable: true,
    apRemaining: 4,
    grid,
  },
};
const set = (updater) => Object.assign(state, updater(state));
const get = () => state;

scanExpeditionTile(0, "scientist", set, get);
assert.equal(state.activeExpedition.grid[0].peeked, undefined);
assert.equal(state.activeExpedition.scansRemaining, 1);

scanExpeditionTile(0, "orbital", set, get);
assert.equal(state.activeExpedition.grid[0].peeked, true);
assert.equal(state.activeExpedition.orbitalScanAvailable, false);
assert.equal(state.activeExpedition.scansRemaining, 1);
assert.equal(state.activeExpedition.apRemaining, 4);

scanExpeditionTile(1, "orbital", set, get);
assert.equal(state.activeExpedition.grid[1].peeked, undefined);

scanExpeditionTile(11, "scientist", set, get);
assert.equal(state.activeExpedition.grid[11].peeked, true);
assert.equal(state.activeExpedition.scansRemaining, 0);

console.log("Expedition orbital scan checks passed");
