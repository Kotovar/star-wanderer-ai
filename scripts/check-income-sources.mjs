import assert from "node:assert/strict";
import { CONTRACT_REWARDS } from "../src/game/contracts/rewards.ts";
import { TRADE_GOODS } from "../src/game/constants/goods.ts";
import { scaleScoutingReward } from "../src/game/progression/incomeBalance.ts";
import { calculateCombatLoot } from "../src/game/slices/combat/helpers/combatSetup.ts";
import {
  BASE_BUY_PRICE_MULTIPLIER,
  MIN_PRICE_VARIATION,
  PRICE_MULTIPLIER_RANGE,
} from "../src/game/slices/trade/constants.ts";

const tradeGood = TRADE_GOODS.electronics;
const tradeQuantity = 10;
const cheapBuy =
  Math.floor(tradeGood.basePrice * MIN_PRICE_VARIATION * BASE_BUY_PRICE_MULTIPLIER) *
  (tradeQuantity / 5);
const expensiveSell =
  Math.floor(tradeGood.basePrice * PRICE_MULTIPLIER_RANGE.max) *
  (tradeQuantity / 5);
const tradeProfit = expensiveSell - cheapBuy;

const rows = [1, 2, 3].map((tier) => ({
  tier,
  battle: calculateCombatLoot(tier, undefined, 0.5),
  contract:
    CONTRACT_REWARDS.scan_planet.base[tier - 1] +
    CONTRACT_REWARDS.scan_planet.range[tier - 1] / 2,
  scouting: scaleScoutingReward(175, tier),
  trade: tradeProfit,
}));

assert.ok(rows.every((row) => row.scouting < row.battle));
assert.ok(rows.every((row) => row.contract >= row.battle));
assert.ok(rows.every((row) => row.trade > 0 && row.trade < row.battle));
assert.ok(
  rows.every((row, index) => index === 0 || row.scouting > rows[index - 1].scouting),
);

console.table(rows);
console.log("Income source checks passed");
