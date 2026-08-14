import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import { registerHooks } from "node:module";
import { dirname, extname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import ts from "typescript";
import "./register-ts-loader.mjs";

const {
  PRE_SPACEFARING_CIVILIZATIONS,
  PRE_SPACEFARING_SETTLEMENT_TILE_INDICES,
} = await import("../src/game/constants/preSpacefaringCivilizations.ts");
const { getPreSpacefaringSettlementCandidate } = await import(
  "../src/game/slices/locations/helpers/expedition/preSpacefaringSettlement.ts",
);

const planet = (id, over = {}) => ({
  id,
  type: "planet",
  isEmpty: true,
  explored: true,
  ...over,
});

const probes = Array.from({ length: 250 }, (_, index) =>
  planet("civilization-probe-" + index),
);
const candidatePlanet = probes.find(
  (entry) => getPreSpacefaringSettlementCandidate(entry, false) !== null,
);
assert.ok(candidatePlanet);

const first = getPreSpacefaringSettlementCandidate(candidatePlanet, false);
const second = getPreSpacefaringSettlementCandidate(candidatePlanet, false);
assert.deepEqual(first, second);
assert.ok(first);
assert.ok(PRE_SPACEFARING_SETTLEMENT_TILE_INDICES.includes(first.tileIndex));
assert.equal(getPreSpacefaringSettlementCandidate(candidatePlanet, true), null);
assert.equal(
  getPreSpacefaringSettlementCandidate(
    planet("not-empty", { isEmpty: false }),
    false,
  ),
  null,
);
assert.equal(
  getPreSpacefaringSettlementCandidate(
    planet("not-explored", { explored: false }),
    false,
  ),
  null,
);
assert.equal(
  getPreSpacefaringSettlementCandidate(
    planet("already-contacted", {
      preSpacefaringContact: {
        civilizationId: "river_clans",
        development: "primitive",
        step: 0,
      },
    }),
    false,
  ),
  null,
);

const sourceFile = (base) =>
  [base, `${base}.ts`, `${base}.tsx`, resolve(base, "index.ts")].find(
    (candidate) => existsSync(candidate) && statSync(candidate).isFile(),
  );
const rewardsFixture =
  "export const collectExpeditionRewards = (rewards, set) => set((state) => ({ credits: state.credits + rewards.credits }));";
const soundsFixture = "export const playSound = () => {};";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (
      specifier === "./collectExpeditionRewards" &&
      context.parentURL?.endsWith("/endExpedition.ts")
    ) {
      return {
        url: `data:text/javascript,${encodeURIComponent(rewardsFixture)}`,
        shortCircuit: true,
      };
    }
    if (specifier === "@/sounds") {
      return {
        url: `data:text/javascript,${encodeURIComponent(soundsFixture)}`,
        shortCircuit: true,
      };
    }
    const parent = context.parentURL
      ? dirname(fileURLToPath(context.parentURL))
      : process.cwd();
    const base = specifier.startsWith("@/")
      ? resolve(process.cwd(), "src", specifier.slice(2))
      : specifier.startsWith(".") && !extname(specifier)
        ? resolve(parent, specifier)
        : null;
    const file = base ? sourceFile(base) : null;
    return file
      ? { url: pathToFileURL(file).href, shortCircuit: true }
      : nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (url.endsWith(".json")) {
      return {
        format: "module",
        source: `export default ${readFileSync(fileURLToPath(url), "utf8")};`,
        shortCircuit: true,
      };
    }
    if (url.endsWith(".ts") || url.endsWith(".tsx")) {
      return {
        format: "module",
        source: ts.transpileModule(readFileSync(fileURLToPath(url), "utf8"), {
          compilerOptions: {
            module: ts.ModuleKind.ESNext,
            target: ts.ScriptTarget.ES2022,
            jsx: ts.JsxEmit.ReactJSX,
          },
          fileName: fileURLToPath(url),
        }).outputText,
        shortCircuit: true,
      };
    }
    return nextLoad(url, context);
  },
});

const { generateExpeditionGrid } = await import(
  "../src/game/slices/locations/helpers/expedition/generateExpeditionGrid.ts"
);
const { revealExpeditionTile } = await import(
  "../src/game/slices/locations/helpers/expedition/revealExpeditionTile.ts"
);
const { abortExpedition } = await import(
  "../src/game/slices/locations/helpers/expedition/endExpedition.ts"
);

const site = {
  civilizationId: "river_clans",
  development: "primitive",
  temperament: "insular",
  tileIndex: 7,
};
const grid = generateExpeditionGrid(
  undefined,
  "resource_vein",
  "Пустынная",
  undefined,
  site,
);
assert.equal(grid[7].type, "settlement");
assert.deepEqual(grid[7].settlement, {
  civilizationId: "river_clans",
  development: "primitive",
  temperament: "insular",
});
assert.notEqual(grid[12].type, "settlement");

const makeDiscoveryHarness = (hasBase = false) => {
  const discoveryPlanet = {
    id: "discovery-planet",
    name: "planet.discovery",
    type: "planet",
    isEmpty: true,
    explored: true,
  };
  const expeditionGrid = Array.from({ length: 25 }, (_, index) => ({
    type: index === 7 ? "settlement" : "signal",
    revealed: index === 12,
    settlement:
      index === 7
        ? {
            civilizationId: "river_clans",
            development: "primitive",
            temperament: "insular",
          }
        : undefined,
    x: index % 5,
    y: Math.floor(index / 5),
  }));
  const sector = { id: 1, locations: [discoveryPlanet] };
  const state = {
    turn: 12,
    credits: 50,
    currentLocation: discoveryPlanet,
    currentSector: sector,
    galaxy: { sectors: [sector] },
    crew: [],
    activeContracts: [],
    outposts: hasBase
      ? [{ id: "base-1", kind: "base", locationId: discoveryPlanet.id }]
      : [],
    activeExpedition: {
      planetId: discoveryPlanet.id,
      grid: expeditionGrid,
      apTotal: 2,
      apRemaining: 2,
      stepApCost: 1,
      revealedCount: 1,
      scansRemaining: 0,
      orbitalScanAvailable: false,
      activeRuinsEvent: null,
      ruinsOutcome: null,
      ruinsDepth: 0,
      pendingTileIndex: null,
      emptyArtifactTileIndex: null,
      pendingPreSpacefaringDiscovery: null,
      rewards: {
        credits: 0,
        tradeGoods: [],
        researchResources: [],
        artifactFound: null,
      },
      finished: false,
      crewIds: [],
    },
  };
  const set = (update) => {
    const next = typeof update === "function" ? update(state) : update;
    if (next) Object.assign(state, next);
  };
  const get = () => ({
    ...state,
    addLog: () => {},
    tryFindArtifact: () => null,
    nextTurn: () => {
      state.turn += 1;
    },
    gainExp: () => {},
    updateShipStats: () => {},
    saveGame: () => {},
  });
  return { state, set, get };
};

const { state, set, get } = makeDiscoveryHarness();
revealExpeditionTile(7, set, get);
assert.equal(state.activeExpedition.apRemaining, 1);
assert.deepEqual(state.currentLocation.preSpacefaringContact, {
  civilizationId: "river_clans",
  development: "primitive",
  temperament: "insular",
  step: 0,
  actionHistory: [],
});
assert.deepEqual(
  state.activeExpedition.pendingPreSpacefaringDiscovery,
  state.currentLocation.preSpacefaringContact,
);
assert.deepEqual(state.activeExpedition.rewards, {
  credits: 0,
  tradeGoods: [],
  researchResources: [],
  artifactFound: null,
});
abortExpedition(set, get);
assert.equal(state.activeExpedition, null);
assert.equal(state.currentLocation.preSpacefaringContact.step, 0);

const staleBase = makeDiscoveryHarness(true);
revealExpeditionTile(7, staleBase.set, staleBase.get);
assert.equal(staleBase.state.currentLocation.preSpacefaringContact, undefined);

const translations = ["ru", "en"].map((language) => ({
  language,
  catalog: JSON.parse(
    readFileSync(resolve("src/lib/locales", `${language}.json`), "utf8"),
  ),
}));
const contactBlockers = [
  "wrong_location",
  "no_contact",
  "already_complete",
  "step_mismatch",
  "invalid_action",
  "base_present",
  "missing_goods",
];
const contactSummaryKeys = [
  "summary_title",
  "summary_spent",
  "summary_received",
  "summary_turns",
  "summary_permanent_effect",
  "legacy_history_unavailable",
];

for (const { language, catalog } of translations) {
  assert.ok(catalog.pre_spacefaring.title, `${language}: contact title`);
  for (const key of contactSummaryKeys) {
    assert.ok(
      catalog.pre_spacefaring[key],
      `${language}: contact summary ${key}`,
    );
  }
  for (const civilization of PRE_SPACEFARING_CIVILIZATIONS) {
    assert.ok(
      catalog.pre_spacefaring.development[civilization.development],
      `${language}: development ${civilization.development}`,
    );
  }
  for (const outcome of ["protected", "assisted", "partnered"]) {
    assert.ok(
      catalog.pre_spacefaring.outcomes[outcome],
      `${language}: outcome ${outcome}`,
    );
  }
  for (const blocker of contactBlockers) {
    assert.ok(
      catalog.pre_spacefaring.blocked[blocker],
      `${language}: blocker ${blocker}`,
    );
    assert.ok(
      catalog.game_logs[`pre_spacefaring_action_${blocker}`],
      `${language}: blocker log ${blocker}`,
    );
  }
  assert.ok(
    catalog.game_logs.pre_spacefaring_action_done,
    `${language}: completion log`,
  );
  assert.ok(
    catalog.outposts.blocked_settlement_discovered,
    `${language}: base settlement blocker`,
  );
  assert.ok(
    catalog.game_logs.outpost_blocked_settlement_discovered,
    `${language}: base settlement blocker log`,
  );
}

const emptyPlanetPanelSource = readFileSync(
  resolve("src/game/components/EmptyPlanetPanel.tsx"),
  "utf8",
);
assert.match(emptyPlanetPanelSource, /PreSpacefaringContactCard/);
assert.match(emptyPlanetPanelSource, /currentLocation\.preSpacefaringContact/);

const contactCardSource = readFileSync(
  resolve("src/game/components/PreSpacefaringContactCard.tsx"),
  "utf8",
);
assert.match(contactCardSource, /contact\.actionHistory/);
assert.match(contactCardSource, /pre_spacefaring\.summary_title/);

const explorationPanelSource = readFileSync(
  resolve("src/game/components/PlanetExplorationPanel.tsx"),
  "utf8",
);
assert.match(explorationPanelSource, /pendingPreSpacefaringDiscovery/);
assert.match(explorationPanelSource, /pre_spacefaring\.discovery_title/);

// ─── Характеры ───────────────────────────────────────────────────────────────

const {
  PRE_SPACEFARING_TEMPERAMENTS,
  TEMPERAMENT_GIFT,
  TEMPERAMENT_OUTCOME_MULTIPLIER,
  DEVELOPMENT_MULTIPLIER,
  DEVELOPMENT_RESOURCES,
  OUTCOME_BASE_UNITS,
  PROTECTED_MATURATION_TURNS,
  PARTNER_SHARE_INTERVAL_TURNS,
  PARTNER_SHARE_CAP,
} = await import("../src/game/constants/preSpacefaringTemperaments.ts");

const ALL_OUTCOMES = ["protected", "assisted", "partnered", "exploited"];

// ─── Характер в сгенерированном поселении ────────────────────────────────────

const temperamentProbes = Array.from({ length: 400 }, (_, index) =>
  planet("temperament-probe-" + index),
);
const candidates = temperamentProbes
  .map((entry) => getPreSpacefaringSettlementCandidate(entry, false))
  .filter((entry) => entry !== null);
assert.ok(candidates.length > 20, `кандидатов слишком мало: ${candidates.length}`);

for (const candidate of candidates) {
  assert.ok(
    PRE_SPACEFARING_TEMPERAMENTS.includes(candidate.temperament),
    JSON.stringify(candidate),
  );
  // Характер не разыгрывается отдельно: он всегда согласован с каталогом,
  // иначе одна и та же цивилизация была бы разной на разных планетах.
  const civ = PRE_SPACEFARING_CIVILIZATIONS.find(
    (entry) => entry.id === candidate.civilizationId,
  );
  assert.ok(civ);
  assert.equal(candidate.temperament, civ.temperament, candidate.civilizationId);
  assert.equal(candidate.development, civ.development, candidate.civilizationId);
}

// Детерминированность сохраняется
const temperamentPlanet = temperamentProbes.find(
  (entry) => getPreSpacefaringSettlementCandidate(entry, false) !== null,
);
assert.deepEqual(
  getPreSpacefaringSettlementCandidate(temperamentPlanet, false),
  getPreSpacefaringSettlementCandidate(temperamentPlanet, false),
);

// В каталоге из 12 записей встречаются разные характеры
assert.ok(
  new Set(candidates.map((entry) => entry.temperament)).size >= 4,
  "генерация не покрывает характеры",
);

assert.deepEqual([...PRE_SPACEFARING_TEMPERAMENTS].sort(), [
  "curious",
  "devout",
  "insular",
  "martial",
  "waning",
]);

// У каждого характера множитель задан для всех четырёх исходов,
// и недоступных исходов не больше одного: иначе выбор схлопывается.
for (const temperament of PRE_SPACEFARING_TEMPERAMENTS) {
  const row = TEMPERAMENT_OUTCOME_MULTIPLIER[temperament];
  assert.deepEqual(Object.keys(row).sort(), [...ALL_OUTCOMES].sort(), temperament);
  const unavailable = ALL_OUTCOMES.filter((outcome) => row[outcome] === null);
  assert.ok(unavailable.length <= 1, `${temperament}: ${unavailable.length} недоступных исходов`);
  for (const outcome of ALL_OUTCOMES) {
    if (row[outcome] !== null) {
      assert.ok(row[outcome] > 0, `${temperament}.${outcome} должен быть положительным`);
    }
  }
  // Дар определён для каждого характера: null означает «не принимают».
  assert.ok(temperament in TEMPERAMENT_GIFT);
}

// Ровно один явно лучший исход у каждого характера — иначе характер
// не задаёт правильного решения и вторая ось не работает.
for (const temperament of PRE_SPACEFARING_TEMPERAMENTS) {
  const row = TEMPERAMENT_OUTCOME_MULTIPLIER[temperament];
  const values = ALL_OUTCOMES.map((outcome) => row[outcome]).filter((v) => v !== null);
  const best = Math.max(...values);
  assert.equal(
    values.filter((v) => v === best).length,
    1,
    `${temperament}: лучший исход не единственный`,
  );
}

assert.deepEqual(Object.keys(DEVELOPMENT_MULTIPLIER).sort(), [
  "agrarian",
  "industrial",
  "modern",
  "primitive",
]);
for (const development of Object.keys(DEVELOPMENT_MULTIPLIER)) {
  assert.ok(DEVELOPMENT_RESOURCES[development].length >= 1, development);
  assert.ok(DEVELOPMENT_RESOURCES[development].length <= 2, development);
}
assert.deepEqual(Object.keys(OUTCOME_BASE_UNITS).sort(), [...ALL_OUTCOMES].sort());
assert.equal(PROTECTED_MATURATION_TURNS, 28);

// ─── Расчёт выплаты и состояния мира ─────────────────────────────────────────

const {
  getPreSpacefaringPayoutUnits,
  splitPayoutUnits,
  getPreSpacefaringCredits,
  resolvePreSpacefaringState,
} = await import(
  "../src/game/slices/locations/helpers/preSpacefaringState.ts"
);

assert.equal(
  getPreSpacefaringPayoutUnits("modern", "waning", "protected", false),
  null,
);
assert.equal(
  getPreSpacefaringPayoutUnits("modern", "insular", "partnered", false),
  null,
);
assert.equal(
  getPreSpacefaringPayoutUnits("primitive", "insular", "protected", false),
  15,
);
assert.equal(
  getPreSpacefaringPayoutUnits("primitive", "insular", "protected", true),
  19,
);
assert.equal(
  getPreSpacefaringPayoutUnits("modern", "devout", "protected", false), 30);
assert.equal(
  getPreSpacefaringPayoutUnits("primitive", "martial", "protected", false),
  Math.max(1, Math.round(10 * 1 * 0.25)),
);
assert.ok(
  getPreSpacefaringPayoutUnits("primitive", "waning", "partnered", false) >= 1,
);

assert.deepEqual(splitPayoutUnits("primitive", 7), [
  { type: "alien_biology", quantity: 7 },
]);
assert.deepEqual(splitPayoutUnits("industrial", 7), [
  { type: "tech_salvage", quantity: 4 },
  { type: "rare_minerals", quantity: 3 },
]);
assert.deepEqual(splitPayoutUnits("industrial", 8), [
  { type: "tech_salvage", quantity: 4 },
  { type: "rare_minerals", quantity: 4 },
]);
assert.deepEqual(splitPayoutUnits("primitive", 0), []);

assert.equal(getPreSpacefaringCredits("primitive", "devout", "protected"), 0);
assert.equal(
  getPreSpacefaringCredits("primitive", "devout", "exploited"),
  Math.round(1500 * 1 * 1.25),
);

const contact = (over = {}) => ({
  civilizationId: "river_clans",
  development: "primitive",
  temperament: "insular",
  step: 3,
  actionHistory: [],
  ...over,
});

assert.deepEqual(
  resolvePreSpacefaringState(contact({ step: 1 }), 50).status,
  "unresolved",
);
assert.deepEqual(resolvePreSpacefaringState(contact({ step: 1 }), 50).claimable, []);

const growing = resolvePreSpacefaringState(
  contact({ outcome: "protected", resolvedAtTurn: 10 }),
  20,
);
assert.equal(growing.status, "growing");
assert.deepEqual(growing.claimable, []);
assert.equal(growing.turnsUntilMaturity, 18);

const matured = resolvePreSpacefaringState(
  contact({ outcome: "protected", resolvedAtTurn: 10 }),
  38,
);
assert.equal(matured.status, "matured");
assert.deepEqual(matured.claimable, [{ type: "alien_biology", quantity: 15 }]);

const claimed = resolvePreSpacefaringState(
  contact({ outcome: "protected", resolvedAtTurn: 10, lastClaimTurn: 38 }),
  400,
);
assert.equal(claimed.status, "matured");
assert.deepEqual(claimed.claimable, []);

assert.deepEqual(
  resolvePreSpacefaringState(
    contact({ outcome: "assisted", resolvedAtTurn: 10 }),
    400,
  ),
  { status: "dependent", claimable: [] },
);
assert.deepEqual(
  resolvePreSpacefaringState(
    contact({ outcome: "exploited", resolvedAtTurn: 10 }),
    400,
  ),
  { status: "collapsed", claimable: [] },
);

const partner = (turn, over = {}) =>
  resolvePreSpacefaringState(
    contact({
      civilizationId: "delta_league",
      development: "agrarian",
      temperament: "curious",
      outcome: "partnered",
      resolvedAtTurn: 0,
      ...over,
    }),
    turn,
  );
assert.deepEqual(partner(5).claimable, []);
assert.equal(partner(5).status, "partner");
assert.deepEqual(partner(6).claimable, [
  { type: "alien_biology", quantity: 1 },
  { type: "ancient_data", quantity: 1 },
]);
assert.deepEqual(partner(18).claimable, [
  { type: "alien_biology", quantity: 3 },
  { type: "ancient_data", quantity: 3 },
]);
assert.deepEqual(partner(36).claimable, partner(9999).claimable);
assert.deepEqual(partner(9999).claimable, [
  { type: "alien_biology", quantity: 6 },
  { type: "ancient_data", quantity: 6 },
]);
assert.deepEqual(partner(30, { lastClaimTurn: 24 }).claimable, [
  { type: "alien_biology", quantity: 1 },
  { type: "ancient_data", quantity: 1 },
]);

for (const outcome of ALL_OUTCOMES) {
  const legacy = resolvePreSpacefaringState(contact({ outcome }), 100000);
  assert.deepEqual(legacy.claimable, [], `legacy ${outcome}`);
}
assert.equal(PARTNER_SHARE_INTERVAL_TURNS, 6);
assert.equal(PARTNER_SHARE_CAP, 6);

// ─── Забор доли ──────────────────────────────────────────────────────────────

const { claimPreSpacefaringYield } = await import(
  "../src/game/slices/locations/helpers/preSpacefaringState.ts"
);

const claimHarness = (contactOver, turn) => {
  const location = {
    id: "planet-claim",
    type: "planet",
    isEmpty: true,
    explored: true,
    preSpacefaringContact: {
      civilizationId: "delta_league",
      development: "agrarian",
      temperament: "curious",
      step: 3,
      actionHistory: [],
      ...contactOver,
    },
  };
  const claimState = {
    turn,
    turnsAdvanced: 0,
    currentLocation: location,
    galaxy: { sectors: [{ id: 1, locations: [location] }] },
    currentSector: { id: 1, locations: [location] },
    research: { resources: {} },
  };
  const claimSet = (update) => {
    Object.assign(
      claimState,
      typeof update === "function" ? update(claimState) : update,
    );
    claimState.currentLocation =
      claimState.galaxy.sectors[0].locations.find((l) => l.id === "planet-claim") ??
      claimState.currentLocation;
  };
  const claimGet = () => ({
    ...claimState,
    addLog: () => {},
    saveGame: () => {},
    nextTurn: () => {
      claimState.turnsAdvanced += 1;
    },
  });
  return { state: claimState, set: claimSet, get: claimGet };
};

// Забор переносит накопленное и не тратит ход
{
  const h = claimHarness({ outcome: "partnered", resolvedAtTurn: 0 }, 18);
  claimPreSpacefaringYield("planet-claim", h.set, h.get);
  assert.equal(h.state.research.resources.alien_biology, 3);
  assert.equal(h.state.research.resources.ancient_data, 3);
  assert.equal(h.state.turnsAdvanced, 0, "забор доли не должен тратить ход");
  assert.equal(h.state.currentLocation.preSpacefaringContact.lastClaimTurn, 18);
}

// Повторный забор без прошедших ходов ничего не даёт
{
  const h = claimHarness({ outcome: "partnered", resolvedAtTurn: 0 }, 18);
  claimPreSpacefaringYield("planet-claim", h.set, h.get);
  const after = { ...h.state.research.resources };
  claimPreSpacefaringYield("planet-claim", h.set, h.get);
  assert.deepEqual(h.state.research.resources, after);
}

// Заповедник отдаёт разовую выплату и больше никогда
{
  const h = claimHarness({ outcome: "protected", resolvedAtTurn: 0 }, 30);
  claimPreSpacefaringYield("planet-claim", h.set, h.get);
  const total = Object.values(h.state.research.resources).reduce((a, b) => a + b, 0);
  assert.ok(total > 0);
  claimPreSpacefaringYield("planet-claim", h.set, h.get);
  assert.equal(
    Object.values(h.state.research.resources).reduce((a, b) => a + b, 0),
    total,
  );
}

// До созревания забирать нечего
{
  const h = claimHarness({ outcome: "protected", resolvedAtTurn: 0 }, 10);
  claimPreSpacefaringYield("planet-claim", h.set, h.get);
  assert.deepEqual(h.state.research.resources, {});
  assert.equal(
    h.state.currentLocation.preSpacefaringContact.lastClaimTurn,
    undefined,
  );
}

// Старое сохранение без resolvedAtTurn не выдаёт ничего
{
  const h = claimHarness({ outcome: "partnered" }, 9999);
  claimPreSpacefaringYield("planet-claim", h.set, h.get);
  assert.deepEqual(h.state.research.resources, {});
}

const gameTypesSource = readFileSync(resolve("src/game/types/game.ts"), "utf8");
assert.match(
  gameTypesSource,
  /export interface GameScouting \{[\s\S]*?claimPreSpacefaringYield: \(planetId: string\) => void;/,
);

// ─── Каталог цивилизаций ─────────────────────────────────────────────────────

const { getPreSpacefaringActions, getUnavailableOutcomes } = await import(
  "../src/game/constants/preSpacefaringTemperaments.ts"
);

assert.equal(PRE_SPACEFARING_CIVILIZATIONS.length, 12);

// Каждый уровень встречается ровно трижды
const byDevelopment = {};
for (const civ of PRE_SPACEFARING_CIVILIZATIONS) {
  byDevelopment[civ.development] = (byDevelopment[civ.development] ?? 0) + 1;
}
assert.deepEqual(byDevelopment, {
  primitive: 3,
  agrarian: 3,
  industrial: 3,
  modern: 3,
});

// Каждый характер встречается не менее двух раз
const byTemperament = {};
for (const civ of PRE_SPACEFARING_CIVILIZATIONS) {
  byTemperament[civ.temperament] = (byTemperament[civ.temperament] ?? 0) + 1;
}
for (const temperament of PRE_SPACEFARING_TEMPERAMENTS) {
  assert.ok(byTemperament[temperament] >= 2, `${temperament}: ${byTemperament[temperament]}`);
}

// Идентификаторы уникальны
assert.equal(
  new Set(PRE_SPACEFARING_CIVILIZATIONS.map((civ) => civ.id)).size,
  12,
);

// Четыре исходных идентификатора сохранили свой уровень: иначе старые
// сохранения показали бы другой мир под тем же названием.
const legacyDevelopment = {
  river_clans: "primitive",
  delta_league: "agrarian",
  forge_cities: "industrial",
  coastal_network: "modern",
};
for (const [id, development] of Object.entries(legacyDevelopment)) {
  const civ = PRE_SPACEFARING_CIVILIZATIONS.find((entry) => entry.id === id);
  assert.ok(civ, `цивилизация ${id} пропала из каталога`);
  assert.equal(civ.development, development, id);
}

// Действия шагов 0 и 1
for (const temperament of PRE_SPACEFARING_TEMPERAMENTS) {
  const step0 = getPreSpacefaringActions(temperament, 0);
  assert.equal(step0.length, 1, `${temperament}: шаг 0 должен быть один`);
  assert.equal(step0[0].requiredGood, undefined);

  const step1 = getPreSpacefaringActions(temperament, 1);
  const gift = TEMPERAMENT_GIFT[temperament];
  if (gift === null) {
    assert.equal(step1.length, 1, `${temperament}: без дара шаг 1 без ложного выбора`);
    assert.ok(!step1.some((action) => action.grantsGiftBonus));
  } else {
    assert.equal(step1.length, 2, `${temperament}: дар и отказ`);
    const giving = step1.filter((action) => action.grantsGiftBonus);
    assert.equal(giving.length, 1, temperament);
    assert.deepEqual(giving[0].requiredGood, gift, temperament);
    assert.equal(step1.filter((a) => a.requiredGood).length, 1, temperament);
  }
}

// Шаг 2 выводится из таблицы множителей — рассинхрона быть не может
for (const temperament of PRE_SPACEFARING_TEMPERAMENTS) {
  const step2 = getPreSpacefaringActions(temperament, 2);
  const available = ALL_OUTCOMES.filter(
    (outcome) => TEMPERAMENT_OUTCOME_MULTIPLIER[temperament][outcome] !== null,
  );
  assert.deepEqual(
    step2.map((action) => action.outcome).sort(),
    [...available].sort(),
    temperament,
  );
  for (const action of step2) {
    assert.equal(action.step, 2);
    assert.equal(action.id, `contact_${action.outcome}`);
  }
  assert.deepEqual(
    [...getUnavailableOutcomes(temperament)].sort(),
    ALL_OUTCOMES.filter(
      (outcome) => TEMPERAMENT_OUTCOME_MULTIPLIER[temperament][outcome] === null,
    ).sort(),
    temperament,
  );
}

// Идентификаторы действий уникальны в пределах характера
for (const temperament of PRE_SPACEFARING_TEMPERAMENTS) {
  const ids = [0, 1, 2].flatMap((step) =>
    getPreSpacefaringActions(temperament, step).map((action) => action.id),
  );
  assert.equal(new Set(ids).size, ids.length, temperament);
}

// ─── Ход контакта ────────────────────────────────────────────────────────────

const {
  advancePreSpacefaringContact,
  getPreSpacefaringContactActionBlocker,
  getPreSpacefaringContactSummary,
} = await import(
  "../src/game/slices/locations/helpers/preSpacefaringContact.ts"
);

const contactHarness = (over = {}) => {
  const location = {
    id: "planet-contact",
    type: "planet",
    isEmpty: true,
    explored: true,
    preSpacefaringContact: {
      civilizationId: "delta_league",
      development: "agrarian",
      temperament: "curious",
      step: 0,
      actionHistory: [],
      ...over,
    },
  };
  const contactState = {
    turn: 40,
    credits: 100,
    outposts: [],
    currentLocation: location,
    galaxy: { sectors: [{ id: 1, locations: [location] }] },
    currentSector: { id: 1, locations: [location] },
    ship: { tradeGoods: [{ item: "electronics", quantity: 3, buyPrice: 10 }] },
    research: { resources: {} },
  };
  const contactSet = (update) => {
    Object.assign(
      contactState,
      typeof update === "function" ? update(contactState) : update,
    );
    contactState.currentLocation =
      contactState.galaxy.sectors[0].locations.find(
        (l) => l.id === "planet-contact",
      ) ?? contactState.currentLocation;
  };
  const contactGet = () => ({
    ...contactState,
    addLog: () => {},
    saveGame: () => {},
    nextTurn: () => {
      contactState.turn += 1;
    },
  });
  return { state: contactState, get: contactGet, set: contactSet };
};

// Шаг 0 — единственное действие, даёт одну единицу и двигает шаг
{
  const h = contactHarness();
  const step0 = getPreSpacefaringActions("curious", 0);
  assert.equal(step0.length, 1);
  advancePreSpacefaringContact("planet-contact", step0[0].id, 0, h.set, h.get);
  const contactAfter = h.state.currentLocation.preSpacefaringContact;
  assert.equal(contactAfter.step, 1);
  assert.equal(h.state.research.resources.alien_biology, 1);
}

// Действие чужого характера не проходит
{
  const h = contactHarness();
  assert.equal(
    getPreSpacefaringContactActionBlocker(
      "planet-contact",
      h.state.currentLocation,
      [],
      h.state.ship.tradeGoods,
      "martial_observe",
      0,
    ),
    "invalid_action",
  );
}

// Шаг 2 недоступен, пока характер не раскрыт наблюдением
{
  const h = contactHarness();
  assert.equal(
    getPreSpacefaringContactActionBlocker(
      "planet-contact",
      h.state.currentLocation,
      [],
      h.state.ship.tradeGoods,
      "contact_partnered",
      2,
    ),
    "step_mismatch",
  );
}

// Дар списывает груз и ставит флаг, ресурсов сразу не даёт
{
  const h = contactHarness({ step: 1 });
  advancePreSpacefaringContact("planet-contact", "curious_gift", 1, h.set, h.get);
  const c = h.state.currentLocation.preSpacefaringContact;
  assert.equal(c.giftGiven, true);
  assert.equal(c.step, 2);
  assert.equal(
    h.state.ship.tradeGoods.find((g) => g.item === "electronics").quantity,
    2,
  );
  assert.deepEqual(h.state.research.resources, {});
}

// Отказ от дара груз сохраняет и флаг не ставит
{
  const h = contactHarness({ step: 1 });
  advancePreSpacefaringContact("planet-contact", "curious_abstain", 1, h.set, h.get);
  const c = h.state.currentLocation.preSpacefaringContact;
  assert.ok(!c.giftGiven);
  assert.equal(
    h.state.ship.tradeGoods.find((g) => g.item === "electronics").quantity,
    3,
  );
}

// Нет груза — дар заблокирован
{
  const h = contactHarness({ step: 1 });
  assert.equal(
    getPreSpacefaringContactActionBlocker(
      "planet-contact",
      h.state.currentLocation,
      [],
      [],
      "curious_gift",
      1,
    ),
    "missing_goods",
  );
}

// Помощь платит сразу, заповедник — нет
{
  const h = contactHarness({ step: 2 });
  advancePreSpacefaringContact("planet-contact", "contact_assisted", 2, h.set, h.get);
  const c = h.state.currentLocation.preSpacefaringContact;
  assert.equal(c.step, 3);
  assert.equal(c.outcome, "assisted");
  assert.equal(c.resolvedAtTurn, 40);
  assert.equal(h.state.research.resources.alien_biology, 3);
  assert.equal(h.state.research.resources.ancient_data, 3);
}
{
  const h = contactHarness({ step: 2 });
  advancePreSpacefaringContact("planet-contact", "contact_protected", 2, h.set, h.get);
  assert.deepEqual(h.state.research.resources, {});
  assert.equal(
    h.state.currentLocation.preSpacefaringContact.resolvedAtTurn,
    40,
  );
}

// Эксплуатация платит ресурсами и кредитами
{
  const h = contactHarness({ step: 2 });
  const creditsBefore = h.state.credits;
  advancePreSpacefaringContact("planet-contact", "contact_exploited", 2, h.set, h.get);
  assert.equal(h.state.currentLocation.preSpacefaringContact.outcome, "exploited");
  assert.ok(h.state.credits > creditsBefore);
  assert.ok((h.state.research.resources.alien_biology ?? 0) > 0);
}

// Недоступный характеру исход заблокирован
{
  const h = contactHarness({
    step: 2,
    civilizationId: "river_clans",
    development: "primitive",
    temperament: "insular",
  });
  assert.equal(
    getPreSpacefaringContactActionBlocker(
      "planet-contact",
      h.state.currentLocation,
      [],
      h.state.ship.tradeGoods,
      "contact_partnered",
      2,
    ),
    "invalid_action",
  );
}

// Журнал считает дар и итог по новым правилам
{
  const summary = getPreSpacefaringContactSummary({
    civilizationId: "delta_league",
    development: "agrarian",
    temperament: "curious",
    step: 3,
    outcome: "assisted",
    giftGiven: true,
    resolvedAtTurn: 10,
    actionHistory: ["curious_observe", "curious_gift", "contact_assisted"],
  });
  assert.equal(summary.turnsSpent, 3);
  assert.equal(summary.goodsSpent.electronics, 1);
  assert.equal(
    Object.values(summary.researchReceived).reduce((a, b) => a + b, 0),
    9,
  );
}

console.log("Pre-spacefaring civilization checks passed");
