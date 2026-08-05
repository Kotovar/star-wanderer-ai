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

console.log("Known object navigator checks passed");
