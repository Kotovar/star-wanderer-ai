import assert from "node:assert/strict";
import {
  calculateCombatLoot,
  MODULE_DAMAGE_PER_THREAT,
} from "../src/game/slices/combat/helpers/combatSetup.ts";
import {
  FUEL_PRICE_PER_UNIT,
  HEAL_CONFIG,
  REPAIR_CONFIG,
} from "../src/game/slices/services/constants.ts";
import { getEmergencyFuelAmount } from "../src/game/progression/emergencyFuel.ts";

const rows = [1, 2, 3, 4].map((tier) => {
  const threat = tier;
  const income = calculateCombatLoot(threat, undefined, 0.5);
  const weaponCount = 1 + Math.ceil(threat / 2);
  const expectedHullDamage = Math.round(
    threat * MODULE_DAMAGE_PER_THREAT * weaponCount * 0.65,
  );
  const repair = Math.round(expectedHullDamage * REPAIR_CONFIG.pricePerHp);
  const healing = Math.round(threat * 8 * HEAL_CONFIG.pricePerHp);
  const fuel = tier * 10 * FUEL_PRICE_PER_UNIT;
  const operatingCost = repair + healing + fuel;

  return {
    tier,
    income,
    repair,
    healing,
    fuel,
    operatingCost,
    net: income - operatingCost,
  };
});

assert.ok(rows.every((row) => row.net > 0), "A median victory must fund recovery");
assert.ok(
  rows.every((row) => row.operatingCost >= row.income * 0.15),
  "Operating costs must create noticeable pressure",
);
assert.equal(getEmergencyFuelAmount(4, 100, 0, 10, "station-a", [], 3), 6);
assert.equal(getEmergencyFuelAmount(10, 100, 0, 10, "station-a", [], 3), 0);
assert.equal(getEmergencyFuelAmount(4, 100, 18, 10, "station-a", [], 3), 0);
assert.equal(
  getEmergencyFuelAmount(4, 100, 0, 10, "station-a", ["station-a"], 3),
  0,
);
assert.ok(
  rows.every((row) => row.operatingCost <= row.income * 0.5),
  "Recovery must not consume most of a median reward",
);
assert.ok(
  rows.every((row, index) => index === 0 || row.net > rows[index - 1].net),
  "Later tiers must improve net combat income",
);

console.table(rows);
console.log("Campaign economy checks passed");
