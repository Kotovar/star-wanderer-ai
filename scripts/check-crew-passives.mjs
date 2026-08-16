import assert from "node:assert/strict";
import { setUiState } from "./register-ui-loader.mjs";

// Пассивки экипажа тянут стор через @/game/crew — грузим через ui-loader
setUiState({ crew: [], ship: { modules: [] } });

const { sumRaceTraitEffect, getBestRaceCrewBonus } = await import(
  "../src/game/races/index.ts"
);
const { getStrongestRaceTechPerkValue, getStrongestTechPerkValue } =
  await import("../src/game/constants/techTree.ts");
const { getPilotInCockpit } = await import("../src/game/crew/getPilotInCockpit.ts");
const { getTotalEvasion } = await import(
  "../src/game/slices/ship/helpers/getTotalEvasion.ts"
);
const { getTotalPower } = await import(
  "../src/game/slices/ship/helpers/getTotalPower.ts"
);
const { getTotalDamage } = await import(
  "../src/game/slices/ship/helpers/getTotalDamage.ts"
);
const { calculateShieldRegen } = await import(
  "../src/game/slices/gameLoop/helpers/shieldRegen.ts"
);
const { getArtifactBonusMultiplier } = await import(
  "../src/game/artifacts/utils.ts"
);
const { processNaniteRepair } = await import(
  "../src/game/slices/gameLoop/helpers/naniteRepair.ts"
);
const { buildCrewMember } = await import("../src/game/crew/buildCrewMember.ts");
const { applyLevelUp } = await import(
  "../src/game/slices/crew/helpers/applyLevelUp.ts"
);
const { getExpNeededForNextLevel } = await import(
  "../src/game/slices/crew/helpers/getExpNeededForNextLevel.ts"
);
const { getTraitById } = await import("../src/game/crew/generation.ts");

const member = (id, extra = {}) => ({
  id,
  name: `c${id}`,
  race: "human",
  profession: "engineer",
  level: 1,
  health: 100,
  maxHealth: 100,
  happiness: 50,
  maxHappiness: 100,
  exp: 0,
  traits: [],
  moduleId: 1,
  techPerks: {},
  assignment: null,
  combatAssignment: null,
  ...extra,
});

/** Один и тот же человек: работающий / мёртвый / приписанный к аванпосту */
const variants = (extra) => ({
  working: [member(1, extra)],
  dead: [member(1, { ...extra, health: 0 })],
  stationed: [member(1, { ...extra, outpostId: "base-1", moduleId: 0 })],
});

/**
 * Общая проверка: пассивка обязана работать у работающего члена экипажа и
 * обязана исчезать у мёртвого и у приписанного к аванпосту.
 */
const assertOnlyWorkingCrewCounts = (label, measure, extra) => {
  const v = variants(extra);
  const base = measure([]);
  const working = measure(v.working);
  assert.notEqual(
    working,
    base,
    `${label}: у работающего пассивка обязана что-то давать`,
  );
  assert.equal(measure(v.dead), base, `${label}: труп не даёт пассивку`);
  assert.equal(
    measure(v.stationed),
    base,
    `${label}: приписанный к аванпосту не даёт пассивку`,
  );
};

// ─── Расовые пассивки ───────────────────────────────────────────────────────

assertOnlyWorkingCrewCounts(
  "sumRaceTraitEffect(evasionBonus)",
  (crew) => sumRaceTraitEffect(crew, "evasionBonus"),
  { race: "krylorian" },
);
assertOnlyWorkingCrewCounts(
  "sumRaceTraitEffect(moduleDefense)",
  (crew) => sumRaceTraitEffect(crew, "moduleDefense"),
  { race: "crystalline" },
);
assertOnlyWorkingCrewCounts(
  "getBestRaceCrewBonus(combat)",
  (crew) => getBestRaceCrewBonus(crew, "combat"),
  { race: "krylorian" },
);

// Пассивка суммируется по людям, а не берётся один раз
assert.equal(
  sumRaceTraitEffect(
    [member(1, { race: "krylorian" }), member(2, { race: "krylorian" })],
    "evasionBonus",
  ),
  sumRaceTraitEffect([member(1, { race: "krylorian" })], "evasionBonus") * 2,
  "расовая прибавка к уклонению складывается по экипажу",
);

// ─── Навыки за уровни (дерево прокачки) ─────────────────────────────────────

const allPerks = { 3: "C", 6: "C", 9: "C" };
assertOnlyWorkingCrewCounts(
  "getStrongestRaceTechPerkValue",
  (crew) => getStrongestRaceTechPerkValue(crew, "crystalline"),
  { race: "crystalline", techPerks: allPerks },
);
assertOnlyWorkingCrewCounts(
  "getStrongestTechPerkValue(engineer, B)",
  (crew) => getStrongestTechPerkValue(crew, "engineer", "B"),
  { profession: "engineer", techPerks: { 3: "B", 6: "B", 9: "B" } },
);

// Ветка не суммируется между людьми — берётся лучший
const perkB = { 3: "B", 6: "B", 9: "B" };
assert.equal(
  getStrongestTechPerkValue(
    [
      member(1, { techPerks: perkB }),
      member(2, { techPerks: perkB }),
      member(3, { techPerks: perkB }),
    ],
    "engineer",
    "B",
  ),
  getStrongestTechPerkValue([member(1, { techPerks: perkB })], "engineer", "B"),
  "три инженера с одной веткой не дают тройной бонус",
);

// ─── Те же правила в корабельных формулах ───────────────────────────────────

const shipState = (crew, modules) => ({
  crew,
  artifacts: [],
  activeEffects: [],
  outposts: [],
  research: { researchedTechs: [], resources: {} },
  ship: {
    modules,
    bonusEvasion: 0,
    bonusPower: 0,
    bonusDamage: 0,
    bonusShieldRegen: 0,
    maxShields: 1000,
    shields: 0,
  },
  currentSector: undefined,
  traveling: null,
  currentCombat: null,
});

const cockpit = [{ id: 1, type: "cockpit", health: 100, maxHealth: 100, level: 1 }];
const reactor = [{ id: 1, type: "reactor", health: 100, maxHealth: 100, power: 10, level: 1 }];
const shieldModule = [{ id: 1, type: "shield", health: 100, maxHealth: 100, shieldRegen: 200, level: 1 }];
const weaponBay = [
  {
    id: 1,
    type: "weaponbay",
    health: 100,
    maxHealth: 100,
    level: 1,
    weapons: [{ type: "laser" }],
  },
];

assertOnlyWorkingCrewCounts(
  "уклонение корабля от расы",
  (crew) => getTotalEvasion(shipState(crew, cockpit)),
  { race: "krylorian" },
);
assertOnlyWorkingCrewCounts(
  "энергия от ветки «Реакторный инженер»",
  (crew) => getTotalPower(shipState(crew, reactor)),
  { profession: "engineer", techPerks: perkB },
);
assertOnlyWorkingCrewCounts(
  "реген щитов от расы воидборнов",
  (crew) => calculateShieldRegen(shipState(crew, shieldModule)).totalRegen,
  { race: "voidborn" },
);
assertOnlyWorkingCrewCounts(
  "урон корабля от боевой расы",
  (crew) => getTotalDamage(shipState(crew, weaponBay)).total,
  { race: "krylorian" },
);
assertOnlyWorkingCrewCounts(
  "множитель артефактов от резонанса",
  (crew) => getArtifactBonusMultiplier({ crew, research: { researchedTechs: [] } }),
  { race: "crystalline" },
);

// Пилот в кабине: мёртвый больше не за штурвалом
assert.ok(
  getPilotInCockpit([member(1, { profession: "pilot" })], cockpit),
  "живой пилот в кабине находится",
);
assert.equal(
  getPilotInCockpit([member(1, { profession: "pilot", health: 0 })], cockpit),
  undefined,
  "мёртвый пилот не считается сидящим за штурвалом",
);

// ─── Здоровье: найм на уровне N против прокачки до N ────────────────────────

for (const [race, traitIds] of [
  ["human", []],
  ["voidborn", []],
  ["human", ["resilient"]],
  ["voidborn", ["resilient"]],
]) {
  const traits = traitIds.map(getTraitById);
  const hired = buildCrewMember({ race, profession: "engineer", level: 5, traits });
  const startingMember = buildCrewMember({
    race,
    profession: "engineer",
    level: 1,
    traits,
  });
  let grown = startingMember.maxHealth;
  for (let level = 1; level < 5; level += 1) {
    grown += applyLevelUp(
      { ...startingMember, level, traits },
      getExpNeededForNextLevel(level),
    ).healthGain;
  }
  assert.equal(
    hired.maxHealth,
    grown,
    `${race}${traitIds.join(",")}: найм на 5 уровне и рост до 5 обязаны дать одно здоровье`,
  );
}

// ─── Технологический авторемонт поднимает модуль с нуля ─────────────────────

const repairState = {
  research: { researchedTechs: ["automated_repair"], resources: {} },
  ship: {
    modules: [
      { id: 1, name: "разбит", type: "reactor", health: 0, maxHealth: 100 },
      { id: 2, name: "цел", type: "lab", health: 100, maxHealth: 100 },
    ],
  },
};
const repairSet = (patch) =>
  Object.assign(
    repairState,
    typeof patch === "function" ? patch(repairState) : patch,
  );
processNaniteRepair(() => ({ ...repairState, addLog: () => {} }), repairSet);
assert.ok(
  repairState.ship.modules[0].health > 0,
  "наниты обязаны поднимать модуль с 0 HP — ради этого их и держат",
);
assert.equal(
  repairState.ship.modules[1].health,
  100,
  "целый модуль не перелезает через максимум",
);

console.log("check-crew-passives: OK");
