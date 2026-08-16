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

const { calculateFuelCost, canWarpJump, getWarpCrystalCost } = jiti(
  "../src/game/slices/travel/helpers/calculateFuelCost.ts",
);

const sector = (id, tier, mapAngle) => ({
  id,
  tier,
  mapAngle,
  star: { type: "yellow" },
  locations: [],
});

const HOME = sector(1, 1, 0);
/** Сосед по тиру: перелёт туда и так мгновенный, прыжок там не нужен */
const NEAR = sector(2, 1, Math.PI / 4);
const MID = sector(4, 2, Math.PI / 4);
const FAR = sector(3, 3, Math.PI);

const makeState = ({ techs = [], crystals = 0 } = {}) => ({
  galaxy: { sectors: [HOME, NEAR, MID, FAR] },
  currentSector: HOME,
  traveling: null,
  crew: [],
  ship: { modules: [], fuel: 100, maxFuel: 100 },
  artifacts: [],
  activeEffects: [],
  research: {
    researchedTechs: techs,
    resources: { quantum_crystals: crystals },
  },
});

const cost = (state, targetId) =>
  calculateFuelCost(state, targetId, false, false, false, true);

// Цена прыжка: база плюс расстояние по тирам
assert.equal(getWarpCrystalCost(makeState(), NEAR.id), 1);
assert.equal(getWarpCrystalCost(makeState(), FAR.id), 3);

// Без технологии прыжка нет, сколько бы кристаллов ни лежало
assert.equal(canWarpJump(makeState({ crystals: 99 }), FAR.id), false);

// Внутри тира прыжка нет даже с полным складом: такой перелёт мгновенный сам
// по себе, а кристаллы нужны исследованиям и крафту
assert.equal(
  canWarpJump(makeState({ techs: ["warp_drive"], crystals: 99 }), NEAR.id),
  false,
);
const sameTierCost = cost(
  makeState({ techs: ["warp_drive"], crystals: 99 }),
  NEAR.id,
);
assert.ok(sameTierCost.fuelCost > 0, "a same-tier hop is paid in fuel");
assert.equal(sameTierCost.crystalCost, 0);

// С технологией, но без кристаллов — обычный перелёт за топливо
const poor = makeState({ techs: ["warp_drive"], crystals: 0 });
assert.equal(canWarpJump(poor, FAR.id), false);
const poorCost = cost(poor, FAR.id);
assert.ok(poorCost.fuelCost > 0, "without crystals the jump costs fuel");
assert.equal(poorCost.travelInstant, false);
assert.equal(poorCost.crystalCost, 0);

// Кристаллов ровно впритык — прыжок доступен и мгновенен
const exact = makeState({ techs: ["warp_drive"], crystals: 3 });
assert.equal(canWarpJump(exact, FAR.id), true);
const exactCost = cost(exact, FAR.id);
assert.deepEqual(exactCost, {
  fuelCost: 0,
  travelInstant: true,
  crystalCost: 3,
});

// Кристаллов хватает на ближний прыжок, но не на дальний:
// дефицит выключает прыжок точечно, а не целиком
const partial = makeState({ techs: ["warp_drive"], crystals: 2 });
assert.equal(canWarpJump(partial, MID.id), true);
assert.equal(canWarpJump(partial, FAR.id), false);

console.log("Warp cost checks passed");
