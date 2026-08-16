import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const scriptPath = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(scriptPath), "..");
const jiti = require("jiti")(scriptPath, {
  alias: { "@": path.join(root, "src") },
});
const { drawStation } = jiti(
  "../src/game/components/sectorMap/drawers.ts",
);

const pirateIconPath = path.join(
  root,
  "public/assets/station-icons/pirate-station.webp",
);
assert.ok(existsSync(pirateIconPath), "pirate station needs a WebP icon asset");
const iconHeader = readFileSync(pirateIconPath).subarray(0, 12);
assert.equal(iconHeader.toString("ascii", 0, 4), "RIFF");
assert.equal(iconHeader.toString("ascii", 8, 12), "WEBP");

const noop = () => {};
const rasterCalls = [];
const pirateIcon = { complete: true, naturalWidth: 384, naturalHeight: 384 };
const context = {
  globalAlpha: 1,
  save: noop,
  restore: noop,
  beginPath: noop,
  closePath: noop,
  moveTo: noop,
  lineTo: noop,
  arc: noop,
  stroke: noop,
  fill: noop,
  createRadialGradient: () => ({ addColorStop: noop }),
  drawImage: (...args) => rasterCalls.push(args),
};

drawStation(
  context,
  100,
  100,
  { id: "pirate-station", type: "station", stationType: "pirate" },
  false,
  undefined,
  pirateIcon,
);
assert.equal(
  rasterCalls.length,
  1,
  "pirate stations must use their raster WebP icon instead of the vector fallback",
);
assert.equal(rasterCalls[0][0], pirateIcon);

console.log("Station icon checks passed");
