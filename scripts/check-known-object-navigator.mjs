import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import { registerHooks } from "node:module";
import { dirname, extname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import ts from "typescript";

const sourceFile = (base) =>
  [base, `${base}.ts`, `${base}.tsx`, resolve(base, "index.ts")].find(
    (candidate) => existsSync(candidate) && statSync(candidate).isFile(),
  );
const crewFixture = `export const buildCrewMember = (member) => ({ ...member, race: "human", health: 100, maxHealth: 100, traits: member.traits ?? [] });`;
const storeFixture = `export const useGameStore = Object.assign(() => ({}), { getState: () => ({}), subscribe: () => () => {} });`;

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "@/game/crew/buildCrewMember") {
      return {
        url: `data:text/javascript,${encodeURIComponent(crewFixture)}`,
        shortCircuit: true,
      };
    }
    if (specifier === "@/game/store") {
      return {
        url: `data:text/javascript,${encodeURIComponent(storeFixture)}`,
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

const { initialState } = await import("../src/game/initial/initialState.ts");
const { loadWithMigrations } = await import("../src/game/saves/migrations.ts");
const {
  collectNavigatorIntel,
  getNavigatorLocationKey,
} = await import("../src/game/navigator/intel.ts");
const {
  createNavigatorSlice,
} = await import("../src/game/slices/navigator/createNavigatorSlice.ts");
const {
  getNavigatorResults,
  getNavigatorTierOptions,
} = await import("../src/game/navigator/search.ts");
const {
  generateStationCrew,
} = await import("../src/game/components/station/station-data.ts");

const legacy = structuredClone(initialState);
const [visited, hidden] = legacy.galaxy.sectors[0].locations;
visited.visited = true;

const migrated = loadWithMigrations(JSON.stringify({ version: 21, state: legacy }));
assert.ok(migrated, "v21 save should load");
assert.ok(migrated.knownLocationIntel[getNavigatorLocationKey(0, visited.id)]);
assert.equal(
  migrated.knownLocationIntel[getNavigatorLocationKey(0, hidden.id)],
  undefined,
);
assert.deepEqual(migrated.navigatorTargets, []);

const sector = structuredClone(initialState.galaxy.sectors[0]);
sector.id = 1;
const [station, enemy] = sector.locations;
Object.assign(station, { id: "station-a", type: "station", visited: false });
Object.assign(enemy, {
  id: "enemy-a",
  type: "enemy",
  threat: 1,
  visited: false,
});
sector.locations = [station, enemy];

const noScanner = structuredClone(initialState);
noScanner.currentSector = sector;
noScanner.galaxy.sectors = [sector];
const noScannerIntel = collectNavigatorIntel(noScanner, sector);
assert.equal(Object.keys(noScannerIntel).length, 1);
assert.equal(
  noScannerIntel[getNavigatorLocationKey(1, "enemy-a")],
  undefined,
);

const scannerMk1 = structuredClone(noScanner);
scannerMk1.ship.modules.push({
  id: 999,
  type: "scanner",
  name: "Scanner Mk.1",
  x: 0,
  y: 0,
  width: 1,
  height: 1,
  health: 100,
  maxHealth: 100,
  level: 1,
  defense: 0,
  scanRange: 3,
});
const scannedIntel = collectNavigatorIntel(scannerMk1, sector);
assert.ok(scannedIntel[getNavigatorLocationKey(1, "enemy-a")]);
scannerMk1.knownLocationIntel = scannedIntel;
assert.equal(Object.keys(collectNavigatorIntel(scannerMk1, sector)).length, 2);

const navigatorState = structuredClone(noScanner);
const setNavigatorState = (update) => {
  const next = typeof update === "function" ? update(navigatorState) : update;
  if (next) Object.assign(navigatorState, next);
};
Object.assign(
  navigatorState,
  createNavigatorSlice(setNavigatorState, () => navigatorState),
);
navigatorState.syncNavigatorIntel();
assert.equal(Object.keys(navigatorState.knownLocationIntel).length, 1);
navigatorState.ship.modules.push(...scannerMk1.ship.modules);
navigatorState.syncNavigatorIntel();
navigatorState.syncNavigatorIntel();
assert.equal(Object.keys(navigatorState.knownLocationIntel).length, 2);

const enemyTarget = { sectorId: 1, locationId: "enemy-a" };
const stationTarget = { sectorId: 1, locationId: "station-a" };
navigatorState.pinNavigatorTarget(enemyTarget);
navigatorState.pinNavigatorTarget(enemyTarget);
assert.deepEqual(navigatorState.navigatorTargets, [enemyTarget]);
navigatorState.pinNavigatorTarget(stationTarget);
navigatorState.unpinNavigatorTarget(enemyTarget);
assert.deepEqual(navigatorState.navigatorTargets, [stationTarget]);
navigatorState.clearNavigatorTargets();
assert.deepEqual(navigatorState.navigatorTargets, []);

const stationConfig = {
  allowsTrade: true,
  allowsCraft: true,
  allowsModuleInstall: true,
  allowsCrewHeal: true,
  guaranteedProfessions: ["engineer"],
  guaranteedWeapons: [],
  guaranteedModules: [],
};
const navigatorSectors = [
  {
    id: 10,
    name: "Alpha",
    danger: 1,
    distance: 1,
    tier: 1,
    star: { type: "yellow_dwarf", name: "star_types.yellow_dwarf" },
    locations: [
      {
        id: "trade-station",
        name: "Alpha Market",
        type: "station",
        stationId: "station-market",
        stationConfig,
        dominantRace: "human",
      },
      {
        id: "friendly-trader",
        name: "Friendly Trader",
        type: "friendly_ship",
        hasTrader: true,
        hasCrew: true,
        dominantRace: "human",
        visited: true,
      },
      {
        id: "crew-station",
        name: "Crew Station",
        type: "station",
        stationId: "crew-station",
        stationConfig: { ...stationConfig, allowsTrade: false },
        dominantRace: "human",
      },
      {
        id: "ocean-planet",
        name: "Pelagos",
        type: "planet",
        planetType: "Океаническая",
        isEmpty: false,
        population: 1200,
        dominantRace: "human",
        visited: true,
      },
      {
        id: "unbeaten-boss",
        name: "Ancient Warden",
        type: "boss",
        bossDefeated: false,
      },
      {
        id: "hidden-enemy",
        name: "Hidden Raider",
        type: "enemy",
        threat: 2,
        defeated: false,
      },
      {
        id: "open-wreck",
        name: "Open Wreck",
        type: "wreck_field",
        wreckExhausted: false,
      },
    ],
  },
  {
    id: 40,
    name: "Omega",
    danger: 4,
    distance: 40,
    tier: 4,
    star: { type: "blackhole", name: "star_types.blackhole" },
    locations: [
      {
        id: "tier-four-planet",
        name: "Forbidden World",
        type: "planet",
        planetType: "Радиоактивная",
      },
    ],
  },
];
const knownLocationIntel = Object.fromEntries(
  [
    [10, "trade-station", 3, false],
    [10, "friendly-trader", 8, true],
    [10, "crew-station", 3, false],
    [10, "ocean-planet", 8, true],
    [10, "unbeaten-boss", 8, false],
    [10, "open-wreck", 3, false],
    [40, "tier-four-planet", 3, false],
  ].map(([sectorId, locationId, highestScanRange, intelVisited]) => [
    getNavigatorLocationKey(sectorId, locationId),
    { sectorId, locationId, highestScanRange, visited: intelVisited },
  ]),
);
const navigatorInput = {
  galaxy: { sectors: navigatorSectors },
  knownLocationIntel,
  knownTradeStations: ["station-market"],
  stationPrices: {
    "station-market": { water: { buy: 100, sell: 60 } },
  },
  friendlyShipStock: {
    "friendly-trader": { water: 7, food: 5, medicine: 3 },
  },
  raceReputation: structuredClone(initialState.raceReputation),
  hiredCrew: {},
  hiredCrewFromShips: [],
  ship: { modules: [] },
  artifacts: [],
  scanRange: 8,
};

const results = (filters, input = navigatorInput) =>
  getNavigatorResults({ ...input, filters });

assert.deepEqual(getNavigatorTierOptions(navigatorInput), [1, 2, 3]);
assert.deepEqual(
  getNavigatorTierOptions({ ...navigatorInput, scanRange: 25 }),
  [1, 2, 3, 4],
);
assert.equal(
  results({ category: "planets" }).some(
    ({ locationId }) => locationId === "tier-four-planet",
  ),
  false,
);
assert.equal(
  results(
    { category: "planets" },
    { ...navigatorInput, scanRange: 25 },
  ).some(({ locationId }) => locationId === "tier-four-planet"),
  true,
);

const waterMerchants = results({ category: "trade", goodId: "water" });
assert.deepEqual(
  waterMerchants.map(({ locationId }) => locationId),
  ["trade-station", "friendly-trader"],
);
assert.deepEqual(
  waterMerchants.map(({ trade }) => trade),
  [
    { goodId: "water", buy: 100, sell: 60 },
    { goodId: "water", buy: 53, sell: 31 },
  ],
);

const hiddenCrew = results({ category: "crew" });
assert.ok(hiddenCrew.some(({ locationId }) => locationId === "friendly-trader"));
assert.equal(
  hiddenCrew.some(
    ({ locationId, crew }) => locationId === "crew-station" && crew,
  ),
  false,
);
const visitedCrewSectors = structuredClone(navigatorSectors);
visitedCrewSectors[0].locations.find(
  ({ id }) => id === "crew-station",
).visited = true;
const visitedCrewIntel = structuredClone(knownLocationIntel);
visitedCrewIntel[getNavigatorLocationKey(10, "crew-station")].visited = true;
const visitedCrewInput = {
  ...navigatorInput,
  galaxy: { sectors: visitedCrewSectors },
  knownLocationIntel: visitedCrewIntel,
};
const revealedCrew = results(
  { category: "crew", profession: "engineer" },
  visitedCrewInput,
).filter(({ locationId }) => locationId === "crew-station");
assert.ok(revealedCrew.length > 0);
assert.ok(revealedCrew.every(({ crew }) => Array.isArray(crew.traits)));

const hiredStationCandidate = generateStationCrew(
  "crew-station",
  "human",
  stationConfig,
)[0];
const availableStationCrew = results(
  { category: "crew" },
  visitedCrewInput,
).filter(({ locationId }) => locationId === "crew-station");
const stationCrewAfterHire = results(
  { category: "crew" },
  {
    ...visitedCrewInput,
    hiredCrew: { "crew-station": [hiredStationCandidate.member.name] },
  },
).filter(({ locationId }) => locationId === "crew-station");
assert.equal(stationCrewAfterHire.length, availableStationCrew.length - 1);
assert.equal(
  results(
    { category: "crew" },
    {
      ...navigatorInput,
      hiredCrewFromShips: ["friendly-trader"],
    },
  ).some(({ locationId }) => locationId === "friendly-trader"),
  false,
);

assert.deepEqual(
  results({
    category: "planets",
    planetType: "Океаническая",
    population: "inhabited",
    race: "human",
    reputation: "neutral",
  }).map(({ locationId }) => locationId),
  ["ocean-planet"],
);
assert.deepEqual(
  results({ category: "missions", unresolvedOnly: true }).map(
    ({ locationId }) => locationId,
  ),
  ["unbeaten-boss"],
);
assert.equal(
  results({ category: "missions" }).some(
    ({ locationId }) => locationId === "hidden-enemy",
  ),
  false,
);
assert.deepEqual(
  results({ category: "discovery", unresolvedOnly: true }).map(
    ({ locationId }) => locationId,
  ),
  ["friendly-trader", "open-wreck"],
);
assert.deepEqual(
  results({ category: "discovery", query: "wreck", tier: 1 }).map(
    ({ locationId }) => locationId,
  ),
  ["open-wreck"],
);

console.log("Known object navigator checks passed");
