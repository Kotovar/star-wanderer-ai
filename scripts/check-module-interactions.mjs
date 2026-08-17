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

const {
  getProjectedModuleEnergyBalance,
  getProjectedModulePurchaseEnergyBalance,
} = jiti(
  "../src/game/slices/shop/helpers/getProjectedModuleEnergyBalance.ts",
);
const { canPlaceModule } = jiti(
  "../src/game/slices/ship/helpers/canPlaceModule.ts",
);

const placementState = {
  ship: {
    gridSize: 5,
    modules: [{ id: 1, x: 0, y: 0, width: 1, height: 1 }],
  },
};

assert.equal(
  canPlaceModule(
    { id: 2, x: 4, y: 4, width: 1, height: 1 },
    4,
    4,
    placementState,
  ),
  false,
  "a new module must connect to the existing ship",
);
assert.equal(
  canPlaceModule(
    { id: 2, x: 1, y: 0, width: 1, height: 1 },
    1,
    0,
    placementState,
  ),
  true,
  "a new module adjacent to the ship must be placeable",
);

const { areModulesFunctional } = jiti(
  "../src/game/slices/ship/helpers/areModulesFunctional.ts",
);
const { processScanContracts } = jiti(
  "../src/game/slices/contracts/helpers/processScanContracts.ts",
);
const { TASK_MODULE_REQUIREMENTS } = jiti(
  "../src/game/slices/crew/helpers/taskModuleRequirements.ts",
);
const { canAccessTier, canSeeTier4 } = jiti(
  "../src/game/galaxy/galaxy-map-utils.ts",
);

const pulseDrive = {
  id: 3,
  type: "pulse_drive",
  x: 0,
  y: 0,
  width: 2,
  height: 2,
  level: 2,
  power: 8,
  fuelEfficiency: 6,
  health: 100,
  maxHealth: 100,
};
const deepSurveyArray = {
  id: 4,
  type: "deep_survey_array",
  x: 0,
  y: 0,
  width: 2,
  height: 2,
  level: 4,
  scanRange: 3,
  health: 100,
  maxHealth: 100,
};

assert.equal(
  areModulesFunctional({ ship: { modules: [pulseDrive] } }, ["engine", "pulse_drive"]),
  true,
  "a pulse drive must count as a working engine",
);
assert.equal(
  canAccessTier(2, [pulseDrive], 2),
  true,
  "a pulse drive level must unlock the matching travel tier",
);
assert.equal(
  canSeeTier4([deepSurveyArray], [], 0),
  true,
  "a level-four deep survey array must reveal tier four",
);
assert.equal(
  TASK_MODULE_REQUIREMENTS.analyzing.includes("deep_survey_array"),
  true,
  "analyzing must be available in a deep survey array",
);
assert.equal(
  TASK_MODULE_REQUIREMENTS.reactor_overload.includes("pulse_drive"),
  true,
  "reactor overload must be available in a pulse drive",
);
assert.equal(
  processScanContracts({
    currentLocation: { id: "ice-1", type: "planet", planetType: "ice" },
    activeContracts: [
      { id: "scan-1", type: "scan_planet", planetType: "ice", requiresVisit: 2 },
    ],
    ship: { modules: [deepSurveyArray] },
  }).success,
  true,
  "a deep survey array must complete scan-contract progress",
);

const { getMissingModuleRecipeGas, MODULE_RECIPES } = jiti(
  "../src/game/constants/crafting.ts",
);

assert.deepEqual(
  getMissingModuleRecipeGas(MODULE_RECIPES.pulse_drive, {}),
  ["polymers", 10],
  "module crafting must expose a missing polymer requirement to the UI",
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
assert.equal(
  typeof getProjectedModulePurchaseEnergyBalance,
  "function",
  "module purchases must expose a projected energy calculation",
);
assert.equal(
  getProjectedModulePurchaseEnergyBalance(state, {
    id: "medical-1-test",
    name: "Medical bay",
    description: "",
    type: "module",
    moduleType: "medical",
    price: 100,
    stock: 1,
    consumption: 2,
  }),
  -1,
  "a purchased consumer module must preview the resulting deficit",
);
assert.equal(
  getProjectedModulePurchaseEnergyBalance(state, {
    id: "reactor-1-test",
    name: "Reactor",
    description: "",
    type: "module",
    moduleType: "reactor",
    price: 100,
    stock: 1,
    power: 5,
  }),
  6,
  "a purchased reactor must preview the resulting reserve",
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
