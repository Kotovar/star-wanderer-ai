import assert from "node:assert/strict";
import {
  getSpaceMonsterHuntReward,
  getSpaceMonsterTypeForStar,
  SPACE_MONSTERS,
} from "../src/game/constants/spaceMonsters.ts";
import { generateEnemyModules } from "../src/game/slices/combat/helpers/combatSetup.ts";

assert.equal(getSpaceMonsterTypeForStar("blackhole", 0.5), "void_ray");
assert.equal(getSpaceMonsterTypeForStar("blue_giant", 0.5), "plasma_leviathan");
assert.equal(getSpaceMonsterTypeForStar("red_dwarf", 0), "nebula_manta");
assert.equal(getSpaceMonsterTypeForStar("red_dwarf", 0.99), "plasma_leviathan");
assert.equal(getSpaceMonsterHuntReward(SPACE_MONSTERS.void_ray, 3), 2);
assert.equal(
  new Set(Object.values(SPACE_MONSTERS).map((monster) => monster.resonanceEffect)).size,
  Object.keys(SPACE_MONSTERS).length,
);

const biologicalModules = generateEnemyModules(3, "space_monster");
assert.ok(biologicalModules.every((module) => module.isBiological));
assert.equal(biologicalModules[0].name, "Живое ядро");
assert.equal(biologicalModules[1].name, "Хищный орган");

console.log("Space monster checks passed");
