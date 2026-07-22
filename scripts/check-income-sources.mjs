import assert from "node:assert/strict";
import { CONTRACT_REWARDS } from "../src/game/contracts/rewards.ts";
import { TRADE_GOODS } from "../src/game/constants/goods.ts";
import { scaleScoutingReward } from "../src/game/progression/incomeBalance.ts";
import { calculateCombatLoot } from "../src/game/slices/combat/helpers/combatSetup.ts";
import {
  BASE_BUY_PRICE_MULTIPLIER,
  MIN_PRICE_VARIATION,
  PRICE_MULTIPLIER_RANGE,
  getTierPriceMultiplier,
} from "../src/game/slices/trade/constants.ts";

const tradeGood = TRADE_GOODS.electronics;
const tradeQuantity = 10;
// Купить дёшево и продать дорого в секторе одного тира; цены растут с тиром
const tradeProfitAtTier = (tier) => {
  const base = tradeGood.basePrice * getTierPriceMultiplier(tier);
  const cheapBuy =
    Math.floor(base * MIN_PRICE_VARIATION * BASE_BUY_PRICE_MULTIPLIER) *
    (tradeQuantity / 5);
  const expensiveSell =
    Math.floor(base * PRICE_MULTIPLIER_RANGE.max) * (tradeQuantity / 5);
  return expensiveSell - cheapBuy;
};

const rows = [1, 2, 3].map((tier) => ({
  tier,
  battle: calculateCombatLoot(tier, undefined, 0.5),
  contract:
    CONTRACT_REWARDS.scan_planet.base[tier - 1] +
    CONTRACT_REWARDS.scan_planet.range[tier - 1] / 2,
  scouting: scaleScoutingReward(175, tier),
  trade: tradeProfitAtTier(tier),
}));

assert.ok(rows.every((row) => row.scouting < row.battle));
assert.ok(rows.every((row) => row.contract >= row.battle));
assert.ok(rows.every((row) => row.trade > 0 && row.trade < row.battle));
assert.ok(
  rows.every((row, index) => index === 0 || row.scouting > rows[index - 1].scouting),
);
// Торговый доход растёт с тиром сектора
assert.ok(
  rows.every((row, index) => index === 0 || row.trade > rows[index - 1].trade),
);

console.table(rows);
console.log("Income source checks passed");
