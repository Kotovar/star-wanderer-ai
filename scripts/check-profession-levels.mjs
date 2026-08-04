import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";

const require = createRequire(import.meta.url);
const scriptPath = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(scriptPath), "..");
const jiti = require("jiti")(scriptPath, {
  alias: { "@": path.join(root, "src") },
});
const { CREW_ASSIGNMENT_EXP } = jiti("../src/game/constants/experience.ts");
const { getExpNeededForNextLevel } = jiti(
  "../src/game/slices/crew/helpers/getExpNeededForNextLevel.ts",
);
const { isValidCrewAssignment } = jiti(
  "../src/game/slices/crew/helpers/validateAssignment.ts",
);
const { getReactorOverloadPower } = jiti(
  "../src/game/slices/gameLoop/processors/crewAssignments/constants.ts",
);
const { processPassiveExperience } = jiti(
  "../src/game/slices/gameLoop/helpers/turnInit.ts",
);

const reactorEngineer = { profession: "engineer", level: 1 };
assert.equal(getReactorOverloadPower(reactorEngineer), 5);
assert.equal(getReactorOverloadPower({ ...reactorEngineer, level: 4 }), 8);

const reactor = { id: 1, type: "reactor" };
assert.equal(
  isValidCrewAssignment(reactorEngineer, reactor, "rapidfire", "combat").valid,
  false,
);
assert.equal(
  isValidCrewAssignment(reactorEngineer, reactor, "reactor_overload").valid,
  true,
);

const xenoGunner = {
  profession: "gunner",
  race: "xenosymbiont",
  isMerged: false,
};
const weaponBay = { id: 2, type: "weaponbay" };

assert.equal(
  isValidCrewAssignment(xenoGunner, weaponBay, "merge").valid,
  true,
  "незросшийся ксеноморф-стрелок должен получать задачу merge у оружейной палубы",
);
assert.equal(
  isValidCrewAssignment({ ...xenoGunner, isMerged: true }, weaponBay, "merge").valid,
  false,
  "сросшийся ксеноморф не должен получать задачу merge повторно",
);
assert.equal(
  isValidCrewAssignment({ ...xenoGunner, race: "human" }, weaponBay, "merge").valid,
  false,
  "не-ксеноморф не должен получать задачу merge",
);
assert.equal(
  isValidCrewAssignment(xenoGunner, { id: 3, type: "weapon" }, "merge").valid,
  false,
  "ксеноморф не должен получать задачу merge в модуле без эффекта",
);

const source = (file) => readFileSync(path.join(root, file), "utf8");
assert.doesNotMatch(
  source("src/game/slices/combat/helpers/playerDamage.ts"),
  /hasOverclock: boolean|hasRapidfire: boolean|hasAnalysis: boolean/,
  "combat assignment damage must not be applied after getTotalDamage",
);
assert.match(
  source("src/game/slices/ship/helpers/getTotalDamage.ts"),
  /OVERCLOCK_DAMAGE \+ engineerLevel \* 0\.01/,
  "overclock damage must be applied once in getTotalDamage",
);

const passiveExp = [];
processPassiveExperience(
  { turn: 5, crew: [reactorEngineer] },
  () => ({
    gainExp: (_crewMember, amount) => passiveExp.push(amount),
    addLog: () => {},
  }),
);
assert.deepEqual(passiveExp, [2]);
assert.deepEqual(
  [1, 2, 3].map(getExpNeededForNextLevel),
  [100, 200, 300],
);
assert.equal(Math.ceil(getExpNeededForNextLevel(1) / CREW_ASSIGNMENT_EXP.REPAIR), 13);

console.log("Profession and experience checks passed");
