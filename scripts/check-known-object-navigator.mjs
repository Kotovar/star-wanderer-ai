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
const crewFixture = `export const buildCrewMember = (member) => ({ ...member, race: member.race ?? "human", health: 100, maxHealth: 100, traits: member.traits ?? [] });`;
const storeFixture = `export const useGameStore = Object.assign((selector) => selector(globalThis.__navigatorTestState), { getState: () => globalThis.__navigatorTestState, subscribe: () => () => {} });`;

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
  getVisibleNavigatorTargetIds,
} = await import("../src/game/navigator/intel.ts");
const {
  getGalaxyMapObjectives,
} = await import("../src/game/components/galaxyMapObjectives.ts");
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
const { CREW_TRAITS, MUTATION_TRAITS } = await import(
  "../src/game/constants/traits.ts"
);
const { selectLocation } = await import(
  "../src/game/slices/travel/helpers/selectLocation.ts"
);
const { createUiSlice } = await import(
  "../src/game/slices/ui/createUiSlice.ts"
);
globalThis.__navigatorTestState = {
  ...initialState,
  getEffectiveScanRange: () => 0,
  pinNavigatorTarget: () => {},
  unpinNavigatorTarget: () => {},
  clearNavigatorTargets: () => {},
  closeNavigator: () => {},
};
const { createElement } = await import("react");
const { renderToStaticMarkup } = await import("react-dom/server");
const { NAVIGATOR_TRAIT_IDS, NavigatorPanel, NavigatorResultDetails } = await import(
  "../src/game/components/NavigatorPanel.tsx"
);
const { default: ru } = await import("../src/lib/locales/ru.json");
const { default: en } = await import("../src/lib/locales/en.json");
const { store: translationStore } = await import("../src/lib/useTranslation.ts");

assert.ok(
  Array.isArray(NAVIGATOR_TRAIT_IDS),
  "Navigator trait filter ids must be exposed for regression checks",
);
assert.equal(
  NAVIGATOR_TRAIT_IDS.some((traitId) => MUTATION_TRAITS.includes(traitId)),
  false,
  "Navigator trait filter must not include mutations",
);
assert.equal(
  new Set(NAVIGATOR_TRAIT_IDS).size,
  NAVIGATOR_TRAIT_IDS.length,
  "Navigator trait filter must not contain duplicate ids",
);

const navigatorTraitIds = Object.values(CREW_TRAITS).flatMap((traits) =>
  traits.map((trait) => trait.id),
);
for (const [locale, catalog] of [
  ["ru", ru],
  ["en", en],
]) {
  for (const traitId of navigatorTraitIds) {
    const traitName = catalog.racial_traits?.[traitId]?.name;
    assert.equal(
      typeof traitName,
      "string",
      `Navigator trait ${traitId} must have a localized ${locale} name`,
    );
    assert.notEqual(
      traitName,
      `racial_traits.${traitId}.name`,
      `Navigator trait ${traitId} must not use a fallback ${locale} name`,
    );
  }
}

assert.equal(typeof ru.navigator.title, "string");
assert.equal(typeof en.navigator.title, "string");
const navigatorMarkup = renderToStaticMarkup(createElement(NavigatorPanel));
assert.ok(navigatorMarkup.includes(ru.navigator.title));
assert.ok(navigatorMarkup.includes(ru.navigator.empty));
assert.ok(
  navigatorMarkup.includes("overflow-y-auto lg:overflow-hidden"),
  "Navigator panel must scroll filters on mobile without changing desktop overflow",
);
const enemyResultMarkup = renderToStaticMarkup(
  createElement(NavigatorResultDetails, {
    result: {
      key: "enemy",
      sectorId: 1,
      sectorName: "Alpha",
      sectorTier: 1,
      locationId: "enemy",
      locationName: "Enemy",
      category: "missions",
      kind: "enemy",
      details: [],
    },
  }),
);
assert.ok(enemyResultMarkup.includes(ru.location_types.enemy_ship));
assert.equal(enemyResultMarkup.includes("location_types.enemy"), false);
const stormResultMarkup = renderToStaticMarkup(
  createElement(NavigatorResultDetails, {
    result: {
      key: "storm",
      sectorId: 1,
      sectorName: "Alpha",
      sectorTier: 1,
      locationId: "storm",
      locationName: "Storm",
      category: "discovery",
      kind: "storm",
      details: [],
    },
  }),
);
assert.ok(stormResultMarkup.includes(ru.location_types.cosmic_storm));
assert.equal(stormResultMarkup.includes("location_types.storm"), false);

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

const lifecycleLegacy = structuredClone(initialState);
const lifecycleSector = structuredClone(lifecycleLegacy.galaxy.sectors[0]);
lifecycleSector.id = 101;
const [legacyTrader, lifecycleHidden] = lifecycleSector.locations;
Object.assign(legacyTrader, {
  id: "legacy-trader",
  name: "Legacy Trader",
  type: "station",
  stationId: "legacy-trader-station",
  dominantRace: "human",
  visited: false,
  stationConfig: undefined,
});
Object.assign(lifecycleHidden, {
  id: "lifecycle-hidden",
  type: "enemy",
  threat: 1,
  visited: false,
});
lifecycleSector.locations = [legacyTrader, lifecycleHidden];
lifecycleLegacy.currentSector = lifecycleSector;
lifecycleLegacy.galaxy.sectors = [lifecycleSector];
lifecycleLegacy.ship.modules.push({
  id: 999,
  type: "scanner",
  name: "Damaged Scanner Mk.1",
  x: 0,
  y: 0,
  width: 1,
  height: 1,
  health: 0,
  maxHealth: 100,
  level: 1,
  defense: 0,
  scanRange: 3,
});
lifecycleLegacy.stationPrices = {
  "legacy-trader-station": { water: { buy: 100, sell: 60 } },
};

const migratedLifecycle = loadWithMigrations(
  JSON.stringify({ version: 21, state: lifecycleLegacy }),
);
assert.ok(migratedLifecycle, "legacy lifecycle save should load");
const lifecycleState = migratedLifecycle;
const setLifecycleState = (update) => {
  const next = typeof update === "function" ? update(lifecycleState) : update;
  if (next) Object.assign(lifecycleState, next);
};
Object.assign(
  lifecycleState,
  createNavigatorSlice(setLifecycleState, () => lifecycleState),
  { nextTurn: () => {} },
);
const lifecycleResults = (filters) =>
  getNavigatorResults({
    artifacts: lifecycleState.artifacts,
    filters,
    friendlyShipStock: lifecycleState.friendlyShipStock,
    galaxy: lifecycleState.galaxy,
    hiredCrew: lifecycleState.hiredCrew,
    hiredCrewFromShips: lifecycleState.hiredCrewFromShips,
    knownLocationIntel: lifecycleState.knownLocationIntel,
    knownTradeStations: lifecycleState.knownTradeStations,
    raceReputation: lifecycleState.raceReputation,
    ship: lifecycleState.ship,
    stationPrices: lifecycleState.stationPrices,
  });

lifecycleState.syncNavigatorIntel();
assert.equal(
  lifecycleResults({ category: "missions" }).some(
    ({ locationId }) => locationId === "lifecycle-hidden",
  ),
  false,
);
lifecycleState.ship.modules = lifecycleState.ship.modules.map((module) =>
  module.type === "scanner" ? { ...module, health: module.maxHealth } : module,
);
assert.equal(
  lifecycleResults({ category: "missions" }).some(
    ({ locationId }) => locationId === "lifecycle-hidden",
  ),
  false,
);
lifecycleState.syncNavigatorIntel();
assert.ok(
  lifecycleResults({ category: "missions" }).some(
    ({ locationId }) => locationId === "lifecycle-hidden",
  ),
);
assert.equal(
  lifecycleResults({ category: "trade", goodId: "water" }).some(
    ({ locationId }) => locationId === "legacy-trader",
  ),
  false,
);
selectLocation(setLifecycleState, () => lifecycleState, 0);
assert.deepEqual(lifecycleState.knownTradeStations, ["legacy-trader-station"]);
assert.deepEqual(
  lifecycleResults({ category: "trade", goodId: "water" })
    .filter(({ locationId }) => locationId === "legacy-trader")
    .map(({ trade }) => trade),
  [{ goodId: "water", buy: 20, sell: 12 }],
);
const lifecycleTraderTarget = { sectorId: 101, locationId: "legacy-trader" };
const lifecycleHiddenTarget = { sectorId: 101, locationId: "lifecycle-hidden" };
lifecycleState.pinNavigatorTarget(lifecycleTraderTarget);
lifecycleState.pinNavigatorTarget(lifecycleHiddenTarget);
assert.deepEqual(lifecycleState.navigatorTargets, [
  lifecycleTraderTarget,
  lifecycleHiddenTarget,
]);
lifecycleState.unpinNavigatorTarget(lifecycleTraderTarget);
assert.deepEqual(lifecycleState.navigatorTargets, [lifecycleHiddenTarget]);
lifecycleState.clearNavigatorTargets();
assert.deepEqual(lifecycleState.navigatorTargets, []);

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
        id: "seen-station",
        name: "Seen Station",
        type: "station",
        stationId: "seen-station",
        stationConfig,
        dominantRace: "human",
      },
      {
        id: "zulu-station",
        name: "Zulu Market",
        type: "station",
        stationId: "station-zulu",
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
        id: "defeated-boss",
        name: "Defeated Boss",
        type: "boss",
        bossDefeated: true,
      },
      {
        id: "defeated-enemy",
        name: "Defeated Enemy",
        type: "enemy",
        threat: 1,
        defeated: true,
        hasQuest: true,
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
    [10, "seen-station", 0, false],
    [10, "zulu-station", 3, false],
    [10, "friendly-trader", 8, true],
    [10, "crew-station", 3, false],
    [10, "ocean-planet", 8, true],
    [10, "unbeaten-boss", 8, false],
    [10, "defeated-boss", 8, false],
    [10, "defeated-enemy", 8, true],
    [10, "open-wreck", 3, false],
    [40, "tier-four-planet", 3, false],
  ].map(([sectorId, locationId, highestScanRange, intelVisited]) => [
    getNavigatorLocationKey(sectorId, locationId),
    { sectorId, locationId, highestScanRange, visited: intelVisited },
  ]),
);
const visibleNavigatorTargets = getVisibleNavigatorTargetIds(
  [
    { sectorId: 10, locationId: "trade-station" },
    { sectorId: 10, locationId: "hidden" },
    { sectorId: 40, locationId: "tier-four-planet" },
  ],
  10,
  knownLocationIntel,
);
assert.deepEqual([...visibleNavigatorTargets], ["trade-station"]);
const galaxyNavigatorObjectives = getGalaxyMapObjectives({
  sectors: navigatorSectors,
  activeContracts: [],
  artifacts: [],
  completedLocations: [],
  runProfileArcTarget: null,
  runProfileArcRewardClaimed: false,
  bossesVisible: false,
  knownLocationIntel,
  navigatorTargets: [
    { sectorId: 10, locationId: "trade-station" },
    { sectorId: 10, locationId: "friendly-trader" },
  ],
});
assert.equal(
  galaxyNavigatorObjectives.filter(
    ({ kind, sectorId }) => kind === "navigator" && sectorId === 10,
  ).length,
  1,
);
const hiddenGalaxyNavigatorObjectives = getGalaxyMapObjectives({
  sectors: navigatorSectors,
  activeContracts: [],
  artifacts: [],
  completedLocations: [],
  runProfileArcTarget: null,
  runProfileArcRewardClaimed: false,
  bossesVisible: false,
  knownLocationIntel,
  navigatorTargets: [{ sectorId: 10, locationId: "hidden" }],
});
assert.equal(
  hiddenGalaxyNavigatorObjectives.some(({ kind }) => kind === "navigator"),
  false,
);
const navigatorInput = {
  galaxy: { sectors: navigatorSectors },
  knownLocationIntel,
  knownTradeStations: ["station-market", "station-zulu"],
  stationPrices: {
    "station-market": { water: { buy: 100, sell: 60 } },
    "station-zulu": { water: { buy: 200, sell: 150 } },
  },
  friendlyShipStock: {
    "friendly-trader": { water: 7, food: 5, medicine: 3 },
  },
  raceReputation: structuredClone(initialState.raceReputation),
  hiredCrew: {},
  hiredCrewFromShips: [],
  ship: {
    modules: [],
    tradeGoods: [{ item: "water", quantity: 9, buyPrice: 0 }],
  },
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
assert.equal(
  results({ category: "trade" }).some(
    ({ locationId }) => locationId === "seen-station",
  ),
  false,
);
const identifiedStationIntel = structuredClone(knownLocationIntel);
identifiedStationIntel[
  getNavigatorLocationKey(10, "seen-station")
].highestScanRange = 3;
assert.ok(
  results(
    { category: "trade" },
    { ...navigatorInput, knownLocationIntel: identifiedStationIntel },
  ).some(({ locationId }) => locationId === "seen-station"),
);

const waterMerchants = results({ category: "trade", goodId: "water" });
assert.deepEqual(
  waterMerchants.map(({ locationId }) => locationId),
  ["trade-station", "friendly-trader", "zulu-station"],
);
assert.deepEqual(
  waterMerchants.map(({ trade }) => trade),
  [
    { goodId: "water", buy: 20, sell: 12 },
    { goodId: "water", buy: 10, sell: 6 },
    { goodId: "water", buy: 40, sell: 30 },
  ],
);
const cargoSaleResults = results({
  category: "trade",
  cargoOnly: true,
  sort: "sell_desc",
});
assert.deepEqual(
  cargoSaleResults.map(({ locationId, trade }) => [
    locationId,
    trade?.goodId,
    trade?.sell,
    trade?.cargoQuantity,
  ]),
  [
    ["zulu-station", "water", 30, 9],
    ["trade-station", "water", 12, 9],
    ["friendly-trader", "water", 6, 9],
  ],
  "Cargo sale mode must list only carried goods at known buyers, ordered by selling price",
);
assert.deepEqual(
  results(
    { category: "trade", cargoOnly: true, sort: "sell_desc" },
    { ...navigatorInput, ship: { modules: [], tradeGoods: [] } },
  ),
  [],
  "Cargo sale mode must not list markets when the hold is empty",
);
assert.deepEqual(
  results(
    { category: "trade", goodId: "water" },
    {
      ...navigatorInput,
      activeCrisis: { id: "raider_wave" },
      raceReputation: { ...navigatorInput.raceReputation, human: 20 },
    },
  ).find(({ locationId }) => locationId === "trade-station")?.trade,
  { goodId: "water", buy: 27, sell: 19 },
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

const hostileStationId = Array.from(
  { length: 100 },
  (_, index) => `hostile-station-${index}`,
).find((stationId) =>
  generateStationCrew(stationId, "human", stationConfig).some(
    ({ member }) => member.race !== "human",
  ),
);
assert.ok(hostileStationId, "hostile station fixture needs a minority candidate");
const hostileCrewInput = {
  ...navigatorInput,
  galaxy: {
    sectors: [
      {
        ...navigatorSectors[0],
        locations: [
          {
            id: hostileStationId,
            name: "Hostile Station",
            type: "station",
            stationId: hostileStationId,
            stationConfig,
            dominantRace: "human",
            visited: true,
          },
        ],
      },
    ],
  },
  knownLocationIntel: {
    [getNavigatorLocationKey(10, hostileStationId)]: {
      sectorId: 10,
      locationId: hostileStationId,
      highestScanRange: 8,
      visited: true,
    },
  },
  raceReputation: {
    ...Object.fromEntries(
      Object.keys(navigatorInput.raceReputation).map((race) => [race, 0]),
    ),
    human: -60,
  },
};
assert.ok(
  generateStationCrew(hostileStationId, "human", stationConfig).some(
    ({ member }) => member.race !== "human",
  ),
);
assert.equal(
  results({ category: "crew" }, hostileCrewInput).some(
    ({ locationId }) => locationId === hostileStationId,
  ),
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
assert.equal(
  results({ category: "missions" }).some(
    ({ locationId }) =>
      locationId === "defeated-enemy" || locationId === "defeated-boss",
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

globalThis.localStorage = { setItem: () => {} };
translationStore.changeLanguage("en");
await new Promise((finish) => setTimeout(finish, 0));
const englishLocalizedMarkup = renderToStaticMarkup(
  createElement(
    "div",
    null,
    createElement(NavigatorResultDetails, {
      result: {
        key: "planet",
        sectorId: 1,
        sectorName: "Alpha",
        sectorTier: 1,
        locationId: "planet",
        locationName: "Planet",
        category: "planets",
        kind: "planet",
        details: ["Океаническая"],
      },
    }),
    createElement(NavigatorResultDetails, {
      result: {
        key: "crew",
        sectorId: 1,
        sectorName: "Alpha",
        sectorTier: 1,
        locationId: "crew",
        locationName: "Crew",
        category: "crew",
        kind: "station",
        details: [],
        crew: {
          race: "human",
          profession: "engineer",
          level: 1,
          traits: ["sharpshooter", "charismatic"],
        },
      },
    }),
    createElement(NavigatorResultDetails, {
      result: {
        key: "trade",
        sectorId: 1,
        sectorName: "Alpha",
        sectorTier: 1,
        locationId: "trade",
        locationName: "Trade",
        category: "trade",
        kind: "station",
        details: ["water"],
      },
    }),
    createElement(NavigatorResultDetails, {
      result: {
        key: "wreck",
        sectorId: 1,
        sectorName: "Alpha",
        sectorTier: 1,
        locationId: "wreck",
        locationName: "Wreck",
        category: "discovery",
        kind: "wreck_field",
        details: ["wreck_field"],
      },
    }),
  ),
);
assert.ok(englishLocalizedMarkup.includes(en.locations.planet_types.oceanic));
assert.ok(englishLocalizedMarkup.includes(en.racial_traits.sharpshooter.name));
assert.ok(englishLocalizedMarkup.includes(en.racial_traits.charismatic.name));
assert.ok(englishLocalizedMarkup.includes(en.trade.goods.water));
assert.ok(englishLocalizedMarkup.includes(en.location_types.wreck_field));
assert.equal(englishLocalizedMarkup.includes("Океаническая"), false);
assert.equal(englishLocalizedMarkup.includes("sharpshooter"), false);
translationStore.changeLanguage("ru");
const russianLocalizedMarkup = renderToStaticMarkup(
  createElement(
    "div",
    null,
    createElement(NavigatorResultDetails, {
      result: {
        key: "planet",
        sectorId: 1,
        sectorName: "Альфа",
        sectorTier: 1,
        locationId: "planet",
        locationName: "Планета",
        category: "planets",
        kind: "planet",
        details: ["Океаническая"],
      },
    }),
    createElement(NavigatorResultDetails, {
      result: {
        key: "crew",
        sectorId: 1,
        sectorName: "Альфа",
        sectorTier: 1,
        locationId: "crew",
        locationName: "Экипаж",
        category: "crew",
        kind: "station",
        details: [],
        crew: {
          race: "human",
          profession: "engineer",
          level: 1,
          traits: ["sharpshooter", "charismatic"],
        },
      },
    }),
    createElement(NavigatorResultDetails, {
      result: {
        key: "trade",
        sectorId: 1,
        sectorName: "Альфа",
        sectorTier: 1,
        locationId: "trade",
        locationName: "Торговля",
        category: "trade",
        kind: "station",
        details: ["water"],
      },
    }),
    createElement(NavigatorResultDetails, {
      result: {
        key: "wreck",
        sectorId: 1,
        sectorName: "Альфа",
        sectorTier: 1,
        locationId: "wreck",
        locationName: "Обломки",
        category: "discovery",
        kind: "wreck_field",
        details: ["wreck_field"],
      },
    }),
  ),
);
assert.ok(russianLocalizedMarkup.includes(ru.locations.planet_types.oceanic));
assert.ok(russianLocalizedMarkup.includes(ru.racial_traits.sharpshooter.name));
assert.ok(russianLocalizedMarkup.includes(ru.racial_traits.charismatic.name));
assert.ok(russianLocalizedMarkup.includes(ru.trade.goods.water));
assert.ok(russianLocalizedMarkup.includes(ru.location_types.wreck_field));
assert.equal(russianLocalizedMarkup.includes("wreck_field"), false);

const navigatorCloseState = {
  ...structuredClone(initialState),
  gameMode: "navigator",
  previousGameMode: "galaxy_map",
};
const setNavigatorCloseState = (update) => {
  const next =
    typeof update === "function" ? update(navigatorCloseState) : update;
  if (next) Object.assign(navigatorCloseState, next);
};
Object.assign(navigatorCloseState, createUiSlice(setNavigatorCloseState));
navigatorCloseState.closeNavigator();
assert.equal(navigatorCloseState.gameMode, "galaxy_map");
assert.equal(navigatorCloseState.previousGameMode, null);

console.log("Known object navigator checks passed");
