import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";

const require = createRequire(import.meta.url);
const scriptPath = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(scriptPath), "..");
const jiti = require("jiti")(scriptPath, {
  alias: { "@": path.join(root, "src") },
});

const {
  appendTravelLog,
  TRAVEL_LOG_LIMIT,
} = jiti("../src/game/slices/travel/helpers/travelLog.ts");

const travelLog = Array.from({ length: TRAVEL_LOG_LIMIT }, (_, index) => ({
  message: `step ${index + 1}`,
  type: "info",
  turn: index + 1,
}));
const traveling = {
  destination: { id: 1 },
  turnsLeft: 2,
  turnsTotal: 2,
  travelLog,
};
const nextEntry = { message: "route progress paused", type: "warning", turn: 8 };
const updated = appendTravelLog(traveling, nextEntry);

assert.equal(updated.travelLog?.length, TRAVEL_LOG_LIMIT);
assert.equal(updated.travelLog?.[0]?.message, "step 2");
assert.deepEqual(updated.travelLog?.at(-1), nextEntry);
assert.equal(traveling.travelLog?.length, TRAVEL_LOG_LIMIT);
assert.equal(traveling.travelLog?.[0]?.message, "step 1");

const ru = JSON.parse(
  readFileSync(path.join(root, "src/lib/locales/ru.json"), "utf8"),
);
const en = JSON.parse(
  readFileSync(path.join(root, "src/lib/locales/en.json"), "utf8"),
);

assert.equal(ru.travel_onboard.flight_log, "Журнал перелёта");
assert.equal(en.travel_onboard.flight_log, "Flight log");
assert.match(ru.travel_onboard.progress, /{{turns}}/);
assert.match(en.travel_onboard.progress, /{{turns}}/);

console.log("Travel log keeps the latest entries without mutating travel state");
