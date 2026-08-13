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

console.log("Pre-spacefaring civilization checks passed");
