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

const { getProjectedModuleEnergyBalance } = jiti(
  "../src/game/slices/shop/helpers/getProjectedModuleEnergyBalance.ts",
);

const state = {
  ship: {
    modules: [
      {
        id: 1,
        type: "reactor",
        power: 10,
        health: 100,
        maxHealth: 100,
      },
      {
        id: 2,
        type: "lab",
        consumption: 8,
        health: 100,
        maxHealth: 100,
      },
      {
        id: 3,
        type: "cockpit",
        consumption: 1,
        health: 100,
        maxHealth: 100,
      },
    ],
  },
  crew: [],
  artifacts: [],
  currentSector: null,
  research: { researchedTechs: [] },
  startModifierIds: [],
  gases: {},
};

assert.equal(
  getProjectedModuleEnergyBalance(state, 2, { consumption: 12 }),
  -3,
  "lab upgrade must preview the whole-ship energy deficit",
);
assert.equal(
  getProjectedModuleEnergyBalance(state, 1, { power: 15 }),
  6,
  "reactor upgrade must preview the whole-ship energy reserve",
);

const { hasModulePointerDragged, resolveModulePointerUp } = jiti(
  "../src/game/components/shipGridInteraction.ts",
);
const shipModule = { id: 7, x: 1, y: 1 };
const pointerStart = { x: 10, y: 10 };
const draggedOut = hasModulePointerDragged(pointerStart, { x: 20, y: 10 }, false);
const draggedBack = hasModulePointerDragged(pointerStart, { x: 11, y: 10 }, draggedOut);

assert.equal(draggedOut, true, "pointer movement beyond the threshold starts a drag");
assert.equal(draggedBack, true, "returning near the start keeps the drag latched");

assert.deepEqual(
  resolveModulePointerUp(shipModule, { x: 1, y: 1 }, true, true, false),
  { type: "open", moduleId: 7 },
  "pointer release without movement must open module details",
);
assert.equal(
  resolveModulePointerUp(shipModule, { x: 1, y: 1 }, true, true, draggedBack),
  null,
  "dragging out and back into the original grid cell must remain a no-op",
);
assert.deepEqual(
  resolveModulePointerUp(shipModule, { x: 2, y: 1 }, true, true, true),
  { type: "move", moduleId: 7, x: 2, y: 1 },
  "valid drag must move the module",
);
assert.equal(
  resolveModulePointerUp(shipModule, { x: 2, y: 1 }, true, false, true),
  null,
  "invalid drag must not turn into a click",
);
assert.equal(
  resolveModulePointerUp(shipModule, { x: 2, y: 1 }, false, true, true),
  null,
  "movement locked after a drag must not open module details",
);

console.log("Module interaction checks passed");
