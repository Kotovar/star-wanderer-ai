import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
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
const galaxyMapSource = await readFile(
  new URL("../src/game/components/GalaxyMap.tsx", import.meta.url),
  "utf8",
);
const galaxyMapUtilsSource = await readFile(
  new URL("../src/game/galaxy/galaxy-map-utils.ts", import.meta.url),
  "utf8",
);
const sectorMapSource = await readFile(
  new URL("../src/game/components/SectorMap.tsx", import.meta.url),
  "utf8",
);

assert.match(
  galaxyMapSource,
  /const playerShipImageCache:/,
  "GalaxyMap keeps the decoded ship sprite across map remounts",
);
assert.match(
  galaxyMapSource,
  /useRef<HTMLImageElement \| null>\(playerShipImageCache\.image\)/,
  "GalaxyMap draws a cached ship sprite on its first remount frame",
);
assert.doesNotMatch(
  galaxyMapUtilsSource,
  /Fallback before the bitmap asset is loaded/,
  "GalaxyMap never replaces the ship with a temporary vector marker",
);

assert.match(
  galaxyMapSource,
  /SECTOR_RULE_IDS\.filter\(/,
  "легенда галактики должна брать правила из общего списка",
);
assert.match(
  galaxyMapSource,
  /discoveredRuleIds\.map\(/,
  "легенда галактики должна объяснять обозначения уже встреченных правил секторов",
);
assert.match(
  galaxyMapSource,
  /const routeChoiceRule = routeChoice/,
  "выбор маршрута должен знать правило целевого сектора",
);
assert.match(
  galaxyMapSource,
  /\{routeChoiceRule && \(/,
  "выбор маршрута через туманность должен показывать правило цели",
);
assert.match(
  sectorMapSource,
  /const currentSectorRule = getSectorRule\(/,
  "карта сектора должна получать правило текущего сектора",
);
assert.match(
  sectorMapSource,
  /t\(currentSectorRule\.descKey\)/,
  "карта сектора должна объяснять текущее правило",
);
assert.match(
  galaxyMapUtilsSource,
  /const badgeX =/,
  "значок правила должен быть привязан к звезде через позицию бейджа",
);
assert.match(
  galaxyMapUtilsSource,
  /ctx\.arc\(badgeX, badgeY/,
  "значок правила должен рисоваться как бейдж у конкретной звезды",
);

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
