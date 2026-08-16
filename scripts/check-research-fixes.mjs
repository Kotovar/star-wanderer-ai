import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { setUiState } from "./register-ui-loader.mjs";

const scriptPath = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(scriptPath), "..");

// Хелперы исследований тянут за собой стор (через @/game/crew) — грузим их
// через ui-loader с заглушкой стора, иначе не разобрать .tsx в цепочке
setUiState({ crew: [], ship: { modules: [] } });

const { applyModuleBonus, calculateResearchOutput, hasLabAndScientist } =
  await import("../src/game/slices/research/helpers/researchHelpers.ts");
const { applyResearchedTechs } = await import(
  "../src/game/research/applyResearchedTechs.ts"
);
const { removeExpiredEffects } = await import(
  "../src/game/slices/planetEffects/helpers/removeEffect.ts"
);

// ─── module_health не чинит и не воскрешает ──────────────────────────────────

const damaged = [
  { id: 1, type: "reactor", health: 30, maxHealth: 100 },
  { id: 2, type: "shield", health: 0, maxHealth: 100 },
  { id: 3, type: "lab", health: 100, maxHealth: 100 },
];
const boosted = applyModuleBonus(damaged, "module_health", 0.1);

assert.deepEqual(
  boosted.map((m) => [m.health, m.maxHealth]),
  [
    [33, 110],
    [0, 110],
    [110, 110],
  ],
  "потолок растёт всем, доля здоровья сохраняется, уничтоженный модуль не оживает",
);

// ─── Учёные: только живые и только на борту ──────────────────────────────────

const lab = { id: 10, type: "lab", health: 80, maxHealth: 80, researchOutput: 5 };
const scientist = (extra) => ({
  id: 1,
  profession: "scientist",
  race: "human",
  level: 1,
  health: 100,
  maxHealth: 100,
  happiness: 50,
  maxHappiness: 100,
  traits: [],
  moduleId: 10,
  assignment: "research",
  ...extra,
});
const shipWith = (crew) => ({
  ship: { modules: [lab] },
  crew,
  research: { researchedTechs: [] },
  activeEffects: [],
});

const labOnly = calculateResearchOutput(shipWith([])).totalOutput;
assert.equal(labOnly, 5, "одна лаборатория даёт свой выход");
assert.ok(
  calculateResearchOutput(shipWith([scientist()])).totalOutput > labOnly,
  "живой учёный на борту науку ускоряет",
);
assert.equal(
  calculateResearchOutput(shipWith([scientist({ health: 0 })])).totalOutput,
  labOnly,
  "мёртвый учёный науку не делает",
);
assert.equal(
  calculateResearchOutput(
    shipWith([scientist({ outpostId: "base-1", moduleId: 0, assignment: null })]),
  ).totalOutput,
  labOnly,
  "учёный, приписанный к аванпосту, науку не делает",
);

assert.equal(hasLabAndScientist(shipWith([scientist()])), true);
assert.equal(
  hasLabAndScientist(shipWith([scientist({ health: 0 })])),
  false,
  "с одним трупом исследование не запустить",
);
assert.equal(
  hasLabAndScientist(shipWith([scientist({ outpostId: "base-1" })])),
  false,
  "с учёным на аванпосте исследование не запустить",
);

// ─── Временный эффект живёт ровно свой срок ──────────────────────────────────

const DURATION = 15;
const state = {
  activeEffects: [
    {
      id: "research_boost",
      name: "boost",
      permanent: false,
      turnsRemaining: DURATION,
      totalTurns: DURATION,
      effects: [{ type: "research_speed", value: 0.2 }],
    },
  ],
  artifacts: [],
  ship: {
    bonusPower: 0,
    bonusShields: 0,
    bonusEvasion: 0,
    bonusDamage: 0,
    bonusShieldRegen: 0,
    maxShields: 100,
    shields: 100,
  },
};
const store = { ...state, addLog: () => {} };
const set = (patch) => {
  Object.assign(state, typeof patch === "function" ? patch(state) : patch);
  Object.assign(store, state);
};

// Ход = потребители работают, затем тикают эффекты (как в nextTurn)
let boostedTurns = 0;
for (let turn = 0; turn < DURATION + 5; turn += 1) {
  if (state.activeEffects.some((e) => e.id === "research_boost")) boostedTurns += 1;
  removeExpiredEffects(set, () => store);
}
assert.equal(
  boostedTurns,
  DURATION,
  `эффект на ${DURATION} ходов обязан отработать ${DURATION} раз`,
);

// Порядок в ходе: тик эффектов идёт после потребителей, наука — после энергии
const loopSource = readFileSync(
  path.join(root, "src/game/slices/gameLoop/gameLoopSlice.ts"),
  "utf8",
);
const at = (needle) => {
  const index = loopSource.indexOf(needle);
  assert.notEqual(index, -1, `в nextTurn нет вызова ${needle}`);
  return index;
};
assert.ok(
  at("managePower(get, set)") < at("get().processResearch()"),
  "наука считается после управления энергией",
);
assert.ok(
  at("get().processResearch()") < at("get().removeExpiredEffects()"),
  "эффекты тикают после того, как наука их использовала",
);

// ─── Повторная технология не удваивает разовые бонусы ────────────────────────

const baseState = {
  ship: { modules: [{ id: 1, type: "lab", health: 100, maxHealth: 100 }] },
  crew: [],
  research: { researchedTechs: [], discoveredTechs: [], unlockedRecipes: [] },
};
const once = applyResearchedTechs(baseState, ["reinforced_hull"]);
const twice = applyResearchedTechs(baseState, [
  "reinforced_hull",
  "reinforced_hull",
]);
assert.deepEqual(
  twice.ship.modules.map((m) => m.maxHealth),
  once.ship.modules.map((m) => m.maxHealth),
  "дубль в списке стартовых технологий не должен удваивать прибавку",
);

console.log("check-research-fixes: OK");
