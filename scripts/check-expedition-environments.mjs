import assert from "node:assert/strict";
import {
  getExpeditionEnvironment,
} from "../src/game/slices/locations/helpers/expedition/constants.ts";

assert.equal(getExpeditionEnvironment("Вулканическая")?.stepDamage, 5);
assert.equal(getExpeditionEnvironment("Ледяная")?.apCost, 2);
assert.equal(
  getExpeditionEnvironment("Океаническая")?.artifactWeightBonus,
  2,
);
assert.equal(getExpeditionEnvironment("Пустынная"), undefined);

console.log("Expedition environment checks passed");
