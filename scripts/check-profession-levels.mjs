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
const { getProfessionLevelGains } = jiti(
  "../src/game/crew/professionLevelGains.ts",
);
const { calculateRetreatChance } = jiti(
  "../src/game/slices/combat/helpers/retreat.ts",
);
const { getGunnerAccuracyBonus } = jiti("../src/game/crew/combatBonuses.ts");
const {
  COMBAT_ACTIONS,
  CREW_ACTIONS,
  XENOSYMBIONT_MERGE_ACTION,
  getCrewActionEffectKey,
  getCrewActionLabelKey,
} = jiti("../src/game/constants/crew.ts");

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

// Прибавки, показываемые в модалке левелапа, должны совпадать с реальными формулами
const gain = (profession, key, from, to) =>
  getProfessionLevelGains(profession, from, to).find((g) => g.key === key);

assert.equal(
  gain("engineer", "reactor_power", 3, 4).to,
  getReactorOverloadPower({ profession: "engineer", level: 4 }),
  "прибавка reactor_power должна совпадать с getReactorOverloadPower",
);
assert.equal(
  gain("pilot", "retreat", 3, 4).to,
  Math.round(
    (calculateRetreatChance({ profession: "pilot", level: 4 }) - 0.5) * 100,
  ),
  "прибавка retreat должна совпадать с calculateRetreatChance",
);
assert.equal(
  gain("gunner", "accuracy", 3, 4).to / 100,
  getGunnerAccuracyBonus({ profession: "gunner", level: 4 }),
  "прибавка accuracy должна совпадать с getGunnerAccuracyBonus",
);
// Канонир упирается в кап на 10 уровне — прибавка после него не показывается
assert.equal(getProfessionLevelGains("gunner", 10, 11).length, 0);
// Ни одна прибавка не показывается без роста уровня
for (const profession of ["pilot", "engineer", "medic", "gunner", "scout", "scientist"]) {
  assert.deepEqual(getProfessionLevelGains(profession, 4, 4), []);
}

// У каждой задачи должны быть подпись и эффект в обеих локалях —
// иначе английская сборка снова покажет русский текст или сырой ключ
const lookup = (catalog, key) =>
  key.split(".").reduce((node, part) => node?.[part], catalog);

for (const locale of ["ru", "en"]) {
  const catalog = JSON.parse(source(`src/lib/locales/${locale}.json`));
  const values = new Set([XENOSYMBIONT_MERGE_ACTION.value]);
  for (const table of [CREW_ACTIONS, COMBAT_ACTIONS]) {
    for (const actions of Object.values(table)) {
      for (const action of actions) values.add(action.value);
    }
  }
  for (const value of values) {
    for (const key of [getCrewActionLabelKey(value), getCrewActionEffectKey(value)]) {
      assert.equal(
        typeof lookup(catalog, key),
        "string",
        `в ${locale}.json нет ключа ${key}`,
      );
    }
  }
}

console.log("Profession and experience checks passed");
