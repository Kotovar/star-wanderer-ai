import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [nanites, therapy, retraining, battleResults] = await Promise.all([
  readFile(new URL("../src/game/slices/combat/helpers/naniteRecovery.ts", import.meta.url), "utf8"),
  readFile(new URL("../src/game/slices/services/helpers/geneticTherapy.ts", import.meta.url), "utf8"),
  readFile(new URL("../src/game/slices/planetEffects/helpers/retrainCrew.ts", import.meta.url), "utf8"),
  readFile(new URL("../src/game/components/BattleResultsPanel.tsx", import.meta.url), "utf8"),
]);

assert.match(nanites, /includes\("nanite_hull"\)/);
assert.match(nanites, /target\.health = restoredHealth/);
assert.match(nanites, /naniteRecoveryUsed = true/);
assert.match(battleResults, /recoverModuleWithNanites/);

assert.match(therapy, /includes\("genetic_enhancement"\)/);
assert.match(therapy, /candidate\.type === "negative"/);
assert.match(therapy, /geneticTherapyUsed: true/);

assert.match(retraining, /includes\("crew_training"\)/);
assert.match(retraining, /academy-retraining:\$\{planetId\}/);
assert.match(retraining, /profession/);

console.log("Technology action extension checks passed");
