import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";
import path from "node:path";

const require = createRequire(import.meta.url);
const scriptPath = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(scriptPath), "..");
const jiti = require("jiti")(scriptPath, {
  alias: { "@": path.join(root, "src") },
});

const { addPilotAsteroidManeuverDelay } = jiti(
  "../src/game/slices/travel/helpers/asteroidManeuver.ts",
);

const traveling = {
  destination: { id: 1, name: "Target" },
  turnsLeft: 2,
  turnsTotal: 2,
  route: "direct",
};

const delayedTravel = addPilotAsteroidManeuverDelay(traveling);

assert.equal(
  delayedTravel.turnsLeft,
  3,
  "a pilot maneuver through asteroids must add one travel turn",
);
assert.equal(
  delayedTravel.turnsTotal,
  3,
  "a pilot maneuver must keep total travel time in sync",
);

const ru = JSON.parse(readFileSync(path.join(root, "src/lib/locales/ru.json"), "utf8"));
const en = JSON.parse(readFileSync(path.join(root, "src/lib/locales/en.json"), "utf8"));

assert.equal(ru.travel_events.asteroids.pilot2_label, "Время");
assert.equal(ru.travel_events.asteroids.pilot2_value, "+1 ход");
assert.equal(en.travel_events.asteroids.pilot2_label, "Time");
assert.equal(en.travel_events.asteroids.pilot2_value, "+1 turn");

console.log("Travel event checks passed");
