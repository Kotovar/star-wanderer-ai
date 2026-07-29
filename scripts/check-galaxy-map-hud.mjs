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
const galaxyUtils = jiti("../src/game/galaxy/galaxy-map-utils.ts");

assert.equal(
  typeof galaxyUtils.getGalaxyMapStatus,
  "function",
  "HUD карты галактики должен получать навигационный статус из реальных модулей",
);

const { getGalaxyMapStatus } = galaxyUtils;

assert.deepEqual(
  getGalaxyMapStatus(
    [{ type: "engine", level: 3, health: 100 }],
    3,
    Number.NaN,
  ),
  {
    fuel: 0,
    engineLevel: 3,
    captainLevel: 3,
    tiers: [
      { tier: 1, unlocked: true },
      { tier: 2, unlocked: true },
      { tier: 3, unlocked: true },
    ],
  },
  "HUD должен нормализовать некорректное топливо и показывать доступные тиры",
);

assert.deepEqual(
  getGalaxyMapStatus(
    [{ type: "engine", level: 4, health: 100, manualDisabled: true }],
    4,
    18,
  ),
  {
    fuel: 18,
    engineLevel: 1,
    captainLevel: 4,
    tiers: [
      { tier: 1, unlocked: true },
      { tier: 2, unlocked: false },
      { tier: 3, unlocked: false },
    ],
  },
  "HUD не должен считать отключённый двигатель рабочим",
);

console.log("Galaxy map HUD checks passed");
