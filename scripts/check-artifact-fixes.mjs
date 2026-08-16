import assert from "node:assert/strict";
import { setUiState } from "./register-ui-loader.mjs";

// Часть артефактных хелперов тянет за собой стор (через @/game/crew) — грузим
// всё через ui-loader с заглушкой стора, иначе не разобрать .tsx в цепочке
setUiState({ crew: [], ship: { modules: [] } });

const { ANCIENT_ARTIFACTS } = await import(
  "../src/game/constants/artifacts.ts"
);
const { calculateFuelCost } = await import(
  "../src/game/slices/travel/helpers/calculateFuelCost.ts"
);
const {
  changeHealthByPercent,
  getArtifactNegativeEffects,
  getAmbushChanceModifier,
  getArtifactEffectValue,
} = await import("../src/game/artifacts/index.ts");
const { processCursedArtifacts } = await import(
  "../src/game/slices/gameLoop/processors/processCursedArtifacts.ts"
);
const { getEffectiveScanRange } = await import(
  "../src/game/slices/scanner/helpers/getEffectiveScanRange.ts"
);
const { getMaxScientistLevel } = await import("../src/game/crew/utils.ts");
const { createVoidbornBoostEffect } = await import(
  "../src/game/slices/artifacts/helpers/boostArtifact.ts"
);

/** Свежая копия каталога: тесты правят флаги активности */
const catalog = () =>
  ANCIENT_ARTIFACTS.map((a) => ({ ...a, effect: { ...a.effect } }));

const activate = (artifacts, id, patch = {}) => {
  const artifact = artifacts.find((a) => a.id === id);
  artifact.discovered = true;
  artifact.researched = true;
  artifact.effect.active = true;
  Object.assign(artifact, patch);
  return artifact;
};

// ─── Варп-Катушка остаётся мгновенной рядом с бесплатным топливом ────────────

const sector = (id, tier, mapAngle) => ({
  id,
  tier,
  mapAngle,
  star: { type: "yellow" },
  locations: [],
});
const HOME = sector(1, 1, 0);
const NEIGHBOUR = sector(2, 1, Math.PI / 4);
const travelState = {
  galaxy: { sectors: [HOME, NEIGHBOUR] },
  currentSector: HOME,
  traveling: null,
  crew: [],
  ship: { modules: [], fuel: 100, maxFuel: 100 },
  artifacts: [],
  activeEffects: [],
  research: { researchedTechs: [], resources: {} },
};
// (fuelFree, voidEngine, warpCoil)
const trip = (fuelFree, voidEngine, warpCoil) =>
  calculateFuelCost(travelState, NEIGHBOUR.id, fuelFree, voidEngine, warpCoil, true);

assert.equal(trip(false, false, true).travelInstant, true, "катушка сама по себе — мгновенный перелёт");
assert.equal(
  trip(false, true, true).travelInstant,
  true,
  "Варп Бездны не должен отбирать у катушки мгновенность",
);
assert.equal(
  trip(true, false, true).travelInstant,
  true,
  "Вакуумный Двигатель не должен отбирать у катушки мгновенность",
);
assert.equal(trip(false, true, true).fuelCost, 0);
assert.equal(trip(true, false, true).fuelCost, 0);
assert.equal(
  trip(false, true, false).travelInstant,
  false,
  "без катушки бесплатный перелёт остаётся обычным по времени",
);

// ─── Проценты от максимума, а не плоские единицы ─────────────────────────────

assert.equal(changeHealthByPercent({ health: 50, maxHealth: 100 }, 5), 55);
assert.equal(
  changeHealthByPercent({ health: 50, maxHealth: 250 }, 5),
  63,
  "тот же артефакт на большом модуле чинит больше, а не столько же",
);
assert.equal(
  changeHealthByPercent({ health: 95, maxHealth: 100 }, 20),
  100,
  "ремонт не перелезает через максимум",
);
assert.equal(
  changeHealthByPercent({ health: 10, maxHealth: 250 }, -75, 1),
  1,
  "проклятие не добивает модуль ниже единицы",
);
assert.equal(changeHealthByPercent({ health: 200, maxHealth: 250 }, -75, 1), 13);

// ─── Проклятия не трогают мёртвых и тех, кто на аванпосте ───────────────────

const crewMember = (id, extra = {}) => ({
  id,
  name: `crew-${id}`,
  race: "human",
  profession: "engineer",
  level: 1,
  health: 100,
  maxHealth: 100,
  happiness: 50,
  maxHappiness: 100,
  traits: [],
  moduleId: 0,
  ...extra,
});

const runCurses = (artifacts, crew, modules = []) => {
  const state = {
    artifacts,
    crew,
    ship: { modules },
    activeEffects: [],
    research: { researchedTechs: [], resources: {} },
    shownHints: [],
  };
  const set = (patch) =>
    Object.assign(state, typeof patch === "function" ? patch(state) : patch);
  processCursedArtifacts(state, set, () => ({ ...state, addLog: () => {} }));
  return state;
};

const abyssCatalog = catalog();
activate(abyssCatalog, "abyss_reactor");
const drained = runCurses(abyssCatalog, [
    crewMember(1),
    crewMember(2, { health: 0 }),
    crewMember(3, { outpostId: "base-1" }),
]);
assert.deepEqual(
  drained.crew.map((c) => c.happiness),
  [45, 50, 50],
  "мораль падает только у живых на борту",
);

const deserters = catalog().map((a) =>
  a.id === "parasitic_nanites"
    ? {
        ...a,
        discovered: true,
        researched: true,
        effect: { ...a.effect, active: true },
        // 100% вместо 1%, чтобы бросок не решал исход проверки
        negativeEffect: { ...a.negativeEffect, value: 100 },
      }
    : a,
);
const afterDesertion = runCurses(deserters, [
  crewMember(1),
  crewMember(2, { health: 0 }),
  crewMember(3, { outpostId: "base-1" }),
]);
assert.deepEqual(
  afterDesertion.crew.map((c) => c.id),
  [2, 3],
  "уйти с корабля может только живой человек с борта",
);

const damaged = runCurses(
  catalog().map((a) =>
    a.id === "black_box"
      ? { ...a, discovered: true, researched: true, effect: { ...a.effect, active: true } }
      : a,
  ),
  [],
  [{ id: 1, name: "большой", type: "hull", health: 250, maxHealth: 250 }],
);
assert.equal(
  damaged.ship.modules[0].health,
  238,
  "проклятие снимает 5% от максимума (12 из 250), а не плоские 5",
);

// ─── Мёртвый учёный больше никого не выручает ───────────────────────────────

const scientist = (extra) =>
  crewMember(9, { profession: "scientist", level: 5, ...extra });
assert.equal(getMaxScientistLevel([scientist()]), 5);
assert.equal(getMaxScientistLevel([scientist({ health: 0 })]), 0, "труп не учёный");
assert.equal(
  getMaxScientistLevel([scientist({ outpostId: "base-1" })]),
  0,
  "учёный на аванпосте не работает над артефактом",
);

// ─── Ритуал не усиливает выключенный артефакт ───────────────────────────────

const ritual = { name: "ритуал", description: "тест", duration: 5 };
const runRitual = (artifacts, artifactId) => {
  const state = { artifacts, activeEffects: [] };
  const set = (patch) =>
    Object.assign(state, typeof patch === "function" ? patch(state) : patch);
  createVoidbornBoostEffect(artifactId, "voidborn", ritual, set, () => ({
    ...state,
    updateShipStats: () => {},
  }));
  return state.activeEffects;
};
const boostTargets = (effects) =>
  effects.filter((e) => e.targetArtifactId).map((e) => e.targetArtifactId);

const activeCatalog = catalog();
activate(activeCatalog, "artifact_compass");
assert.deepEqual(
  boostTargets(runRitual(activeCatalog, "artifact_compass")),
  ["artifact_compass"],
  "включённый артефакт ритуал усиливает",
);
assert.deepEqual(
  boostTargets(runRitual(catalog(), "artifact_compass")),
  [],
  "выключенный артефакт не должен получать эффект усиления втихую",
);
assert.equal(
  runRitual(catalog(), "artifact_compass").length,
  1,
  "бонус к топливу выдаётся в любом случае",
);

// ─── Резонанс кристаллических считается один раз ────────────────────────────

const scanArtifacts = catalog();
const quantum = activate(scanArtifacts, "quantum_scanner");
const crystalline = (id) => crewMember(id, { race: "crystalline" });
const scanState = (crew, boosted) => ({
  artifacts: scanArtifacts,
  crew,
  research: { researchedTechs: [], resources: {} },
  ship: { modules: [{ id: 1, type: "scanner", health: 100, scanRange: 5 }] },
  outposts: [],
  turn: 0,
  activeEffects: boosted
    ? [
        {
          id: "boost",
          name: "boost",
          turnsRemaining: 5,
          targetArtifactId: "quantum_scanner",
          effects: [{ type: "artifact_boost", value: 0.5 }],
        },
      ]
    : [],
});

for (const [label, crew, boosted] of [
  ["без экипажа", [], false],
  ["три кристаллина", [crystalline(1), crystalline(2), crystalline(3)], false],
  ["три кристаллина + ритуал", [crystalline(1), crystalline(2), crystalline(3)], true],
]) {
  const state = scanState(crew, boosted);
  assert.equal(
    getEffectiveScanRange(state),
    5 + getArtifactEffectValue(quantum, state),
    `дальность = сканер + эффект артефакта ровно один раз (${label})`,
  );
}

// ─── Оба поля негативных эффектов читаются вместе ───────────────────────────

const eye = ANCIENT_ARTIFACTS.find((a) => a.id === "singularity_eye");
assert.deepEqual(
  getArtifactNegativeEffects(eye).map((n) => n.type),
  ["ambush_chance", "evasion_penalty"],
  "и основной эффект, и дополнительные",
);
assert.deepEqual(getArtifactNegativeEffects({}), []);

const eyeCatalog = catalog();
assert.equal(getAmbushChanceModifier(eyeCatalog), 0, "выключенное Око не мешает");
activate(eyeCatalog, "singularity_eye");
assert.equal(
  getAmbushChanceModifier(eyeCatalog),
  eye.negativeEffect.value,
  "прибавка к засадам берётся из самого артефакта, а не из числа в коде",
);

console.log("check-artifact-fixes: OK");
