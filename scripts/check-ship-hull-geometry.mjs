import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import "./register-ts-loader.mjs";

const { getShipHullRects } = await import(
  "../src/game/components/shipGrid/hullGeometry.ts"
);
const { getShipGridPoint } = await import(
  "../src/game/components/shipGridInteraction.ts"
);

assert.deepEqual(
  getShipHullRects(
    [
      { id: 10, type: "engine", x: 1, y: 2, width: 2, height: 1 },
      { id: 11, type: "weaponShed", x: 0, y: 0, width: 1, height: 1 },
      { id: 12, type: "lab", x: 0, y: 0, width: 1, height: 2 },
    ],
    100,
  ),
  [
    { id: 10, x: 100, y: 200, width: 200, height: 100 },
    { id: 12, x: 0, y: 0, width: 100, height: 200 },
  ],
);

assert.deepEqual(
  getShipGridPoint(124, 224, { left: 100, top: 200, width: 1048, height: 1048 }, 500),
  { x: 0, y: 0 },
);

const shipGrid = await readFile(
  new URL("../src/game/components/ShipGrid.tsx", import.meta.url),
  "utf8",
);
assert.ok(
  shipGrid.lastIndexOf('<g filter="url(#ship-hull-rim)"') >
    shipGrid.indexOf("{modules.map((mod) => ("),
  "the hull rim must render above module artwork",
);

console.log("ship hull geometry checks passed");
