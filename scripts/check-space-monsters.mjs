import assert from "node:assert/strict";
import {
  getSpaceMonsterHuntReward,
  getSpaceMonsterTypeForStar,
  SPACE_MONSTERS,
} from "../src/game/constants/spaceMonsters.ts";
import { generateEnemyModules } from "../src/game/slices/combat/helpers/combatSetup.ts";

assert.equal(getSpaceMonsterTypeForStar("blackhole", 0.5), "void_ray");
assert.equal(getSpaceMonsterTypeForStar("blue_giant", 0.5), "plasma_leviathan");
// Every star type now has a dedicated monster — roll is ignored once mapped.
assert.equal(getSpaceMonsterTypeForStar("red_dwarf", 0), "ember_wisp");
assert.equal(getSpaceMonsterTypeForStar("red_dwarf", 0.99), "ember_wisp");
assert.equal(getSpaceMonsterTypeForStar("yellow_dwarf", 0.5), "ember_wisp");
assert.equal(getSpaceMonsterTypeForStar("double", 0.5), "binary_wyrm");
assert.equal(getSpaceMonsterTypeForStar("triple", 0.5), "binary_wyrm");
assert.equal(getSpaceMonsterHuntReward(SPACE_MONSTERS.void_ray, 3), 2);
assert.equal(
  new Set(Object.values(SPACE_MONSTERS).map((monster) => monster.resonanceEffect)).size,
  Object.keys(SPACE_MONSTERS).length,
);
assert.deepEqual(
  Object.values(SPACE_MONSTERS).map((monster) => monster.firstContact.type).sort(),
  ["artifact_hint", "heal_crew", "refuel", "refuel", "reveal_sector", "reveal_sector"],
);
// heal_crew/refuel first contacts are full gifts now, not partial top-ups —
// no numeric value on the definition, the actual amount is computed live.
assert.equal("value" in SPACE_MONSTERS.nebula_manta.firstContact, false);
assert.equal("value" in SPACE_MONSTERS.plasma_leviathan.firstContact, false);
assert.equal("value" in SPACE_MONSTERS.ember_wisp.firstContact, false);
Object.values(SPACE_MONSTERS).forEach((monster) => {
  assert.equal(typeof monster.loreKey, "string");
});

const biologicalModules = generateEnemyModules(3, "space_monster");
assert.ok(biologicalModules.every((module) => module.isBiological));
assert.equal(biologicalModules[0].name, "Живое ядро");
assert.equal(biologicalModules[1].name, "Хищный орган");

console.log("Space monster checks passed");
