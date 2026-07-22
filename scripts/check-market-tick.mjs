import assert from "node:assert/strict";
import {
  driftStationPrices,
  restockStations,
  PRICE_FLOOR_MULTIPLIER,
  PRICE_CEIL_MULTIPLIER,
} from "../src/game/stations/marketTick.ts";
import { TRADE_GOODS } from "../src/game/constants/goods.ts";
import {
  STOCK_RANGE,
  getTierPriceMultiplier,
} from "../src/game/slices/trade/constants.ts";

const goodIds = Object.keys(TRADE_GOODS);
const basePrices = Object.fromEntries(
  goodIds.map((id) => [id, TRADE_GOODS[id].basePrice]),
);
const RESTOCK_TARGET = Math.round((STOCK_RANGE.min + STOCK_RANGE.max) / 2);

const makePrices = () => ({
  st1: Object.fromEntries(
    goodIds.map((id) => [
      id,
      { sell: TRADE_GOODS[id].basePrice, buy: Math.floor(TRADE_GOODS[id].basePrice * 1.6) },
    ]),
  ),
});

// 1. Дрейф не выводит sell из коридора и сохраняет buy > sell
let prices = makePrices();
for (let i = 0; i < 200; i++) {
  prices = driftStationPrices(prices, basePrices);
  for (const id of goodIds) {
    const { buy, sell } = prices.st1[id];
    const base = TRADE_GOODS[id].basePrice;
    assert.ok(sell >= Math.floor(base * PRICE_FLOOR_MULTIPLIER), `${id}: sell ${sell} ниже пола`);
    assert.ok(sell <= Math.floor(base * PRICE_CEIL_MULTIPLIER), `${id}: sell ${sell} выше потолка`);
    assert.ok(buy > sell, `${id}: buy ${buy} <= sell ${sell} (арбитраж)`);
  }
}

// 2. Дрейф детерминирован при фиксированном random и реально двигает цены
const up = driftStationPrices(makePrices(), basePrices, () => 1); // максимум вверх
assert.ok(up.st1.water.sell > TRADE_GOODS.water.basePrice, "дрейф вверх не сработал");
const down = driftStationPrices(makePrices(), basePrices, () => 0); // максимум вниз
assert.ok(down.st1.water.sell < TRADE_GOODS.water.basePrice, "дрейф вниз не сработал");

// 2а. Тир сектора расширяет коридор дрейфа: цены станции тира 3 живут в коридоре base×2
const tierMult = getTierPriceMultiplier(3);
assert.equal(tierMult, 2, "множитель тира 3 должен быть ×2");
let tierPrices = {
  st1: Object.fromEntries(
    goodIds.map((id) => [
      id,
      {
        sell: TRADE_GOODS[id].basePrice * tierMult,
        buy: Math.floor(TRADE_GOODS[id].basePrice * tierMult * 1.6),
      },
    ]),
  ),
};
for (let i = 0; i < 200; i++) {
  tierPrices = driftStationPrices(tierPrices, basePrices, Math.random, { st1: tierMult });
  for (const id of goodIds) {
    const { buy, sell } = tierPrices.st1[id];
    const base = TRADE_GOODS[id].basePrice * tierMult;
    assert.ok(sell >= Math.floor(base * PRICE_FLOOR_MULTIPLIER), `${id}: tier-sell ${sell} ниже пола`);
    assert.ok(sell <= Math.floor(base * PRICE_CEIL_MULTIPLIER), `${id}: tier-sell ${sell} выше потолка`);
    assert.ok(buy > sell, `${id}: tier buy ${buy} <= sell ${sell} (арбитраж)`);
  }
}

// 3. Restock тянет пустой склад к цели и не превышает её
let stock = { st1: Object.fromEntries(goodIds.map((id) => [id, 0])) };
for (let i = 0; i < 100; i++) {
  stock = restockStations(stock, RESTOCK_TARGET);
  for (const id of goodIds) {
    assert.ok(stock.st1[id] <= RESTOCK_TARGET, `${id}: restock превысил цель`);
  }
}
for (const id of goodIds) {
  assert.equal(stock.st1[id], RESTOCK_TARGET, `${id}: склад не дошёл до цели`);
}

// 4. Сток выше цели не трогается
const rich = { st1: Object.fromEntries(goodIds.map((id) => [id, 999])) };
const richAfter = restockStations(rich, RESTOCK_TARGET);
for (const id of goodIds) {
  assert.equal(richAfter.st1[id], 999, `${id}: restock тронул полный склад`);
}

// 5. Кризисные модификаторы: ID кризисов валидны, множители сохраняют buy > sell
const { CRISIS_MARKET_EFFECTS, applyCrisisMarketModifier } = await import(
  "../src/game/stations/crisisMarket.ts"
);
const KNOWN_CRISIS_IDS = ["raider_wave", "solar_flare", "epidemic", "fuel_shortage"];
for (const crisisId of Object.keys(CRISIS_MARKET_EFFECTS)) {
  assert.ok(KNOWN_CRISIS_IDS.includes(crisisId), `неизвестный кризис: ${crisisId}`);
  for (const [goodId, mult] of Object.entries(CRISIS_MARKET_EFFECTS[crisisId])) {
    assert.ok(goodIds.includes(goodId), `${crisisId}: неизвестный товар ${goodId}`);
    assert.ok(mult > 1, `${crisisId}/${goodId}: множитель ${mult} должен быть > 1`);
    const modified = applyCrisisMarketModifier({ buy: 160, sell: 100 }, crisisId, goodId);
    assert.ok(modified.buy > modified.sell, `${crisisId}/${goodId}: арбитраж после модификатора`);
  }
}
const untouched = applyCrisisMarketModifier({ buy: 160, sell: 100 }, null, "water");
assert.deepEqual(untouched, { buy: 160, sell: 100 }, "без кризиса цены изменились");

console.log("✅ check-market-tick: дрейф цен, пополнение складов и кризисные модификаторы в порядке");
