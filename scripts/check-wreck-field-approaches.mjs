import assert from "node:assert/strict";
import {
  getWreckScannerRareChanceMultiplier,
  getWreckSpecialLootChance,
  getRadiationDamageReport,
  WRECK_APPROACH_CONFIG,
  WRECK_LAB_ANCIENT_DATA_MULTIPLIER,
  WRECK_SPECIAL_LOOT_CHANCE_CAP,
} from "../src/game/slices/locations/constants.ts";

assert.deepEqual(WRECK_APPROACH_CONFIG.standard, {
  rewardMult: 1,
  damageMult: 1,
  rareChanceMult: 1,
  crewProtected: false,
});
assert.ok(WRECK_APPROACH_CONFIG.surface.rewardMult < 1);
assert.ok(WRECK_APPROACH_CONFIG.surface.damageMult < 1);
assert.equal(WRECK_APPROACH_CONFIG.surface.crewProtected, true);
assert.ok(WRECK_APPROACH_CONFIG.deep.rewardMult > 1);
assert.ok(WRECK_APPROACH_CONFIG.deep.damageMult > 1);
assert.ok(WRECK_APPROACH_CONFIG.deep.rareChanceMult > 1);
assert.equal(getWreckScannerRareChanceMultiplier(3), 1);
assert.equal(getWreckScannerRareChanceMultiplier(5), 1.1);
assert.equal(getWreckScannerRareChanceMultiplier(8), 1.25);
assert.equal(getWreckSpecialLootChance(0.6, 1.5, 1.25), WRECK_SPECIAL_LOOT_CHANCE_CAP);
assert.equal(WRECK_LAB_ANCIENT_DATA_MULTIPLIER, 2);
assert.deepEqual(getRadiationDamageReport(23, 0), {
  shieldDamage: 0,
  overflowDamage: 23,
});
assert.deepEqual(getRadiationDamageReport(23, 10), {
  shieldDamage: 10,
  overflowDamage: 13,
});

console.log("Wreck field approach checks passed");
