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

const { applyReputationPriceModifier } = jiti(
  "../src/game/reputation/priceModifier.ts",
);
const { sellTradeGood } = jiti(
  "../src/game/slices/trade/helpers/sellTradeGood.ts",
);

const repAt = (value) => ({ human: value });

// Модификаторы покупки по уровням репутации (база 100 за 5т → цена за 5т)
assert.equal(applyReputationPriceModifier(repAt(-100), "human", 100, "buy"), 200); // hostile ×2.0
assert.equal(applyReputationPriceModifier(repAt(-30), "human", 100, "buy"), 140); // unfriendly ×1.4
assert.equal(applyReputationPriceModifier(repAt(0), "human", 100, "buy"), 100); // neutral ×1.0
assert.equal(applyReputationPriceModifier(repAt(30), "human", 100, "buy"), 90); // friendly ×0.9
assert.equal(applyReputationPriceModifier(repAt(100), "human", 100, "buy"), 80); // allied ×0.8

// Модификаторы продажи
assert.equal(applyReputationPriceModifier(repAt(-100), "human", 100, "sell"), 70); // hostile ×0.7
assert.equal(applyReputationPriceModifier(repAt(0), "human", 100, "sell"), 100); // neutral
assert.equal(applyReputationPriceModifier(repAt(100), "human", 100, "sell"), 120); // allied ×1.2

// Количество ≠ 5 считается за единицу
assert.equal(applyReputationPriceModifier(repAt(0), "human", 100, "buy", undefined, 1), 20);

// Anti-arbitrage: продажа всегда дешевле встречной покупки, покупка дороже встречной продажи
for (const rep of [-100, -30, 0, 30, 100]) {
  const sell = applyReputationPriceModifier(repAt(rep), "human", 100, "sell", 100);
  const buyOpposite = Math.floor((100 / 5) * 100) / 100 * 5;
  assert.ok(sell < buyOpposite, `sell ${sell} должен быть < ${buyOpposite} при rep=${rep}`);
  const buy = applyReputationPriceModifier(repAt(rep), "human", 100, "buy", 100);
  assert.ok(buy > 0, `buy ${buy} при rep=${rep}`);
}

// Цена никогда не падает ниже 1
assert.equal(applyReputationPriceModifier(repAt(-100), "human", 1, "sell"), 1);

const traderSaleState = {
  credits: 0,
  activeCrisis: null,
  crew: [
    {
      health: 100,
      traits: [{ effect: { sellPriceBonus: 0.1 } }],
    },
  ],
  raceReputation: repAt(100),
  currentLocation: {
    stationId: "allied-station",
    dominantRace: "human",
    stationConfig: { isPirate: false },
  },
  stationPrices: {
    "allied-station": { minerals: { buy: 160, sell: 100 } },
  },
  ship: { tradeGoods: [{ item: "minerals", quantity: 5 }] },
};
const setTraderSaleState = (update) => {
  const patch =
    typeof update === "function" ? update(traderSaleState) : update;
  if (patch && patch !== traderSaleState) Object.assign(traderSaleState, patch);
};
const getTraderSaleState = () => ({
  ...traderSaleState,
  addLog: () => undefined,
  changeReputation: () => undefined,
});
sellTradeGood(setTraderSaleState, getTraderSaleState, "minerals", 5);
assert.equal(
  traderSaleState.credits,
  127,
  "a trader bonus must not turn an allied station's buy/sell spread into profit",
);

console.log("Price modifier checks passed");
