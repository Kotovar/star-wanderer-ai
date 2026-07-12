import assert from "node:assert/strict";
import { rollEnemyThreat } from "../src/game/progression/enemyProgression.ts";

assert.equal(rollEnemyThreat(1, false, 0), 1);
assert.equal(rollEnemyThreat(1, false, 0.9), 2);
assert.equal(rollEnemyThreat(3, false, 0.5), 3);
assert.equal(rollEnemyThreat(4, false, 0.9), 5);
assert.equal(rollEnemyThreat(4, true, 0.9), 6);

console.log("Enemy progression checks passed");
