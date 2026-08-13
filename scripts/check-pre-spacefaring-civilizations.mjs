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

assert.equal(PRE_SPACEFARING_CIVILIZATIONS.length, 4);
assert.deepEqual(
  PRE_SPACEFARING_CIVILIZATIONS.map((entry) => entry.development).sort(),
  ["agrarian", "industrial", "modern", "primitive"],
);

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

const { advancePreSpacefaringContact } = await import(
  "../src/game/slices/locations/helpers/preSpacefaringContact.ts",
);

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
        ? { civilizationId: "river_clans", development: "primitive" }
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
  step: 0,
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

const makeContactState = (civilization) => {
  const contactPlanet = {
    id: "contact-" + civilization.id,
    type: "planet",
    isEmpty: true,
    explored: true,
    preSpacefaringContact: {
      civilizationId: civilization.id,
      development: civilization.development,
      step: 0,
    },
  };
  const sector = { id: 1, locations: [contactPlanet] };
  return {
    turn: 20,
    currentLocation: contactPlanet,
    currentSector: sector,
    galaxy: { sectors: [sector] },
    outposts: [],
    ship: {
      tradeGoods: [
        { item: "food", quantity: 4, buyPrice: 1 },
        { item: "medicine", quantity: 4, buyPrice: 1 },
        { item: "spares", quantity: 4, buyPrice: 1 },
      ],
    },
    research: { resources: {} },
  };
};

for (const civilization of PRE_SPACEFARING_CIVILIZATIONS) {
  const contactState = makeContactState(civilization);
  let nextTurnCalls = 0;
  let saveCalls = 0;
  const contactSet = (update) => {
    const next =
      typeof update === "function" ? update(contactState) : update;
    if (next) Object.assign(contactState, next);
  };
  const contactGet = () => ({
    ...contactState,
    addLog: () => {},
    nextTurn: () => {
      nextTurnCalls += 1;
      contactState.turn += 1;
      saveCalls += 1;
    },
    saveGame: () => {
      saveCalls += 1;
    },
  });

  const observation = civilization.actions.find((action) => action.step === 0);
  const help = civilization.actions.find(
    (action) => action.step === 1 && action.requiredGood,
  );
  const boundary = civilization.actions.find(
    (action) => action.step === 2 && action.outcome === "protected",
  );
  assert.ok(observation);
  assert.ok(help);
  assert.ok(boundary);

  advancePreSpacefaringContact(
    contactState.currentLocation.id,
    observation.id,
    0,
    contactSet,
    contactGet,
  );
  advancePreSpacefaringContact(
    contactState.currentLocation.id,
    help.id,
    1,
    contactSet,
    contactGet,
  );
  advancePreSpacefaringContact(
    contactState.currentLocation.id,
    boundary.id,
    2,
    contactSet,
    contactGet,
  );

  assert.equal(contactState.currentLocation.preSpacefaringContact.step, 3);
  assert.equal(
    contactState.currentLocation.preSpacefaringContact.outcome,
    "protected",
  );
  assert.equal(nextTurnCalls, 3);
  assert.equal(saveCalls, 3);

  const completedSnapshot = JSON.stringify({
    turn: contactState.turn,
    contact: contactState.currentLocation.preSpacefaringContact,
    goods: contactState.ship.tradeGoods,
    research: contactState.research.resources,
  });
  advancePreSpacefaringContact(
    contactState.currentLocation.id,
    boundary.id,
    2,
    contactSet,
    contactGet,
  );
  assert.equal(
    JSON.stringify({
      turn: contactState.turn,
      contact: contactState.currentLocation.preSpacefaringContact,
      goods: contactState.ship.tradeGoods,
      research: contactState.research.resources,
    }),
    completedSnapshot,
  );
}

const makeHarness = (harnessState) => {
  let nextTurnCalls = 0;
  let saveCalls = 0;
  const harnessSet = (update) => {
    const next =
      typeof update === "function" ? update(harnessState) : update;
    if (next) Object.assign(harnessState, next);
  };
  const harnessGet = () => ({
    ...harnessState,
    addLog: () => {},
    nextTurn: () => {
      nextTurnCalls += 1;
      harnessState.turn += 1;
      saveCalls += 1;
    },
    saveGame: () => {
      saveCalls += 1;
    },
  });
  return {
    set: harnessSet,
    get: harnessGet,
    nextTurnCalls: () => nextTurnCalls,
    saveCalls: () => saveCalls,
  };
};

const contactSnapshot = (contactState) =>
  JSON.stringify({
    turn: contactState.turn,
    contact: contactState.currentLocation.preSpacefaringContact,
    goods: contactState.ship.tradeGoods,
    research: contactState.research.resources,
  });

const firstCulture = PRE_SPACEFARING_CIVILIZATIONS[0];
const firstHelp = firstCulture.actions.find(
  (action) => action.step === 1 && action.requiredGood,
);
const firstObservation = firstCulture.actions.find(
  (action) => action.step === 0,
);
const otherObservation = PRE_SPACEFARING_CIVILIZATIONS[1].actions.find(
  (action) => action.step === 0,
);
assert.ok(firstHelp);
assert.ok(firstObservation);
assert.ok(otherObservation);

const assertBlockedActionIsNoop = (
  blockedState,
  action,
  expectedStep = blockedState.currentLocation.preSpacefaringContact.step,
) => {
  const harness = makeHarness(blockedState);
  const before = contactSnapshot(blockedState);
  advancePreSpacefaringContact(
    blockedState.currentLocation.id,
    action.id,
    expectedStep,
    harness.set,
    harness.get,
  );
  assert.equal(contactSnapshot(blockedState), before);
  assert.equal(harness.nextTurnCalls(), 0);
  assert.equal(harness.saveCalls(), 0);
};

const missingCargoState = makeContactState(firstCulture);
missingCargoState.currentLocation.preSpacefaringContact.step = 1;
missingCargoState.ship.tradeGoods = [];
assertBlockedActionIsNoop(missingCargoState, firstHelp);

const wrongCultureState = makeContactState(firstCulture);
assertBlockedActionIsNoop(wrongCultureState, otherObservation);

const staleStepState = makeContactState(firstCulture);
staleStepState.currentLocation.preSpacefaringContact.step = 1;
assertBlockedActionIsNoop(staleStepState, firstObservation, 0);

const baseState = makeContactState(firstCulture);
baseState.outposts = [
  { id: "base-1", kind: "base", locationId: baseState.currentLocation.id },
];
assertBlockedActionIsNoop(baseState, firstObservation);

const linkedBaseState = makeContactState(firstCulture);
linkedBaseState.currentLocation.outpostId = "base-2";
assertBlockedActionIsNoop(linkedBaseState, firstObservation);

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

for (const { language, catalog } of translations) {
  assert.ok(catalog.pre_spacefaring.title, `${language}: contact title`);
  for (const civilization of PRE_SPACEFARING_CIVILIZATIONS) {
    assert.ok(
      catalog.pre_spacefaring.development[civilization.development],
      `${language}: development ${civilization.development}`,
    );
    assert.ok(
      catalog.pre_spacefaring.civilizations[civilization.id].name,
      `${language}: civilization ${civilization.id}`,
    );
    for (const action of civilization.actions) {
      assert.ok(
        catalog.pre_spacefaring.actions[action.id],
        `${language}: action ${action.id}`,
      );
    }
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

const explorationPanelSource = readFileSync(
  resolve("src/game/components/PlanetExplorationPanel.tsx"),
  "utf8",
);
assert.match(explorationPanelSource, /pendingPreSpacefaringDiscovery/);
assert.match(explorationPanelSource, /pre_spacefaring\.discovery_title/);

console.log("Pre-spacefaring civilization checks passed");
