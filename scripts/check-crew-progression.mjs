import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";

const require = createRequire(import.meta.url);
const scriptPath = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(scriptPath), "..");
const jiti = require("jiti")(scriptPath, {
  alias: { "@": path.join(root, "src") },
});

const { applyLevelUp } = jiti("../src/game/slices/crew/helpers/applyLevelUp.ts");
const { calculateGainExpResult } = jiti(
  "../src/game/slices/crew/helpers/calculateGainExpResult.ts",
);
const { getExpNeededForNextLevel } = jiti(
  "../src/game/slices/crew/helpers/getExpNeededForNextLevel.ts",
);
const { buildCrewMember } = jiti("../src/game/crew/buildCrewMember.ts");
const { MAX_CREW_LEVEL } = jiti("../src/game/constants/crew.ts");
const { getPendingCrewPerkChoice } = jiti("../src/game/crew/techPerks.ts");
const { retrainCrewMember } = jiti(
  "../src/game/slices/planetEffects/helpers/retrainCrew.ts",
);
const { grantCombatExpOnce } = jiti("../src/game/crew/combatExp.ts");

const levelUpTo = (member, chunks) => {
  let current = { ...member };
  for (const chunk of chunks) {
    const outcome = applyLevelUp(current, (current.exp ?? 0) + chunk);
    if (outcome) {
      current = {
        ...current,
        level: outcome.level,
        exp: outcome.exp,
        maxHealth: current.maxHealth + outcome.healthGain,
      };
    }
  }
  return current;
};

// ─── Расовый бонус здоровья не зависит от размера порции опыта ────────────────

for (const race of ["krylorian", "human", "voidborn"]) {
  const base = buildCrewMember({ id: 1, race, profession: "gunner", level: 1 });
  const stepByStep = levelUpTo(base, [100, 200]);
  const oneChunk = levelUpTo(base, [300]);
  const hiredAtThree = buildCrewMember({
    id: 2,
    race,
    profession: "gunner",
    level: 3,
  });

  assert.equal(stepByStep.level, 3, `${race}: два начисления дают 3 уровень`);
  assert.equal(oneChunk.level, 3, `${race}: одно начисление даёт 3 уровень`);
  assert.equal(
    oneChunk.maxHealth,
    stepByStep.maxHealth,
    `${race}: скачок через уровень не должен стоить здоровья`,
  );
  assert.equal(
    stepByStep.maxHealth,
    hiredAtThree.maxHealth,
    `${race}: прокачанный до 3 уровня равен нанятому третьим уровнем`,
  );
}

// ─── Потолок уровня ──────────────────────────────────────────────────────────

const capped = levelUpTo(
  buildCrewMember({ id: 3, race: "human", profession: "pilot", level: 1 }),
  [999999],
);
assert.equal(capped.level, MAX_CREW_LEVEL, "уровень упирается в потолок");

const atCap = { ...capped, exp: getExpNeededForNextLevel(MAX_CREW_LEVEL) };
assert.equal(applyLevelUp(atCap, 999999), null, "на потолке левелапа нет");

const cappedGain = calculateGainExpResult(atCap, 500, {
  crew: [atCap],
  research: { researchedTechs: [] },
});
assert.equal(cappedGain.finalAmount, 0, "на потолке опыт не начисляется");
assert.equal(cappedGain.leveledUp, false);
assert.equal(
  cappedGain.newExp,
  getExpNeededForNextLevel(MAX_CREW_LEVEL),
  "опыт на потолке не растёт — полоса просто стоит полной",
);

assert.equal(
  buildCrewMember({ id: 4, level: 25 }).level,
  MAX_CREW_LEVEL,
  "найм и шаблоны тоже упираются в потолок",
);

// ─── Левелап не откатывает состояние, изменённое после снимка ────────────────

const outcome = applyLevelUp(
  buildCrewMember({ id: 5, race: "human", profession: "medic", level: 1 }),
  100,
);
assert.deepEqual(
  Object.keys(outcome).toSorted(),
  ["exp", "healthGain", "level"],
  "левелап отдаёт прибавку здоровья, а не готовые maxHealth/happiness из снимка",
);

// ─── Переучивание не переносит ветку в чужое дерево ──────────────────────────

const retrainee = {
  ...buildCrewMember({ id: 6, race: "human", profession: "pilot", level: 3 }),
  techPerks: { 3: "A" },
};
const retrainState = {
  credits: 5000,
  crew: [retrainee],
  planetCooldowns: {},
  research: { researchedTechs: ["crew_training"] },
  currentLocation: { id: "p1", type: "planet", dominantRace: "human" },
};
const retrainStore = {
  ...retrainState,
  addLog: () => {},
  updateShipStats: () => {},
};
const applySet = (patch) => {
  Object.assign(
    retrainState,
    typeof patch === "function" ? patch(retrainState) : patch,
  );
  Object.assign(retrainStore, retrainState);
};
assert.equal(
  retrainCrewMember(6, "engineer", applySet, () => retrainStore),
  true,
  "переучивание проходит",
);
const retrained = retrainState.crew[0];
assert.equal(retrained.profession, "engineer");
assert.equal(
  retrained.techPerks?.[3],
  undefined,
  "профессиональная ветка сбрасывается — её эффект в новом дереве другой",
);
assert.deepEqual(
  getPendingCrewPerkChoice([{ ...retrained, health: 100 }]),
  { crewMemberId: 6, profession: "engineer", tier: 3 },
  "игрок выбирает ветку заново уже в новом дереве",
);

// Расовая ветка (C) от профессии не зависит и обязана пережить переучивание
const racePerkState = {
  credits: 5000,
  crew: [{ ...retrainee, id: 7, techPerks: { 3: "C" } }],
  planetCooldowns: {},
  research: { researchedTechs: ["crew_training"] },
  currentLocation: { id: "p2", type: "planet", dominantRace: "human" },
};
const racePerkStore = {
  ...racePerkState,
  addLog: () => {},
  updateShipStats: () => {},
};
retrainCrewMember(
  7,
  "engineer",
  (patch) => {
    Object.assign(
      racePerkState,
      typeof patch === "function" ? patch(racePerkState) : patch,
    );
    Object.assign(racePerkStore, racePerkState);
  },
  () => racePerkStore,
);
assert.equal(racePerkState.crew[0].techPerks?.[3], "C", "расовая ветка остаётся");

// ─── Опыт за бой — раз за бой, а не раз за раунд ─────────────────────────────

const combatState = {
  currentCombat: { round: 1, assignmentExpCrewIds: undefined },
};
const granted = [];
const combatStore = {
  ...combatState,
  gainExp: (member, amount) => granted.push([member.id, amount]),
};
const combatSet = (patch) => {
  Object.assign(
    combatState,
    typeof patch === "function" ? patch(combatState) : patch,
  );
  Object.assign(combatStore, combatState);
};
const gunner = { id: 11 };
const medic = { id: 12 };
for (let round = 0; round < 5; round += 1) {
  grantCombatExpOnce(gunner, 4, combatSet, () => combatStore);
  grantCombatExpOnce(medic, 10, combatSet, () => combatStore);
}
assert.deepEqual(
  granted,
  [
    [11, 4],
    [12, 10],
  ],
  "пять раундов дают ровно одно начисление на человека",
);

combatState.currentCombat = null;
Object.assign(combatStore, combatState);
assert.equal(
  grantCombatExpOnce(gunner, 4, combatSet, () => combatStore),
  false,
  "вне боя начисления нет",
);

console.log("check-crew-progression: OK");
