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

const { getCurrentCargo } = jiti(
  "../src/game/slices/ship/helpers/getCurrentCargo.ts",
);
const { addTradeGoodWithinCapacity } = jiti(
  "../src/game/slices/ship/helpers/addTradeGood.ts",
);

assert.equal(
  getCurrentCargo({
    ship: {
      cargo: [{ quantity: 3 }],
      tradeGoods: [{ quantity: 35 }],
    },
    probes: 2,
  }),
  40,
  "ordinary cargo, trade goods, and probes must all use cargo capacity",
);

assert.deepEqual(
  addTradeGoodWithinCapacity(
    [{ item: "food", quantity: 39, buyPrice: 0 }],
    "food",
    4,
    1,
  ),
  {
    tradeGoods: [{ item: "food", quantity: 40, buyPrice: 0 }],
    accepted: 1,
    discarded: 3,
  },
  "a reward may only take available cargo space",
);

console.log("Cargo capacity checks passed");
