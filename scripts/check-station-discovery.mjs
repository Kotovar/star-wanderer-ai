import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { STATION_CONFIG } from "../src/game/galaxy/config.ts";
import {
  getStationRateValue,
  getStationRates,
  getStationServiceKeys,
} from "../src/game/stations/discovery.ts";

const constsSource = await readFile(
  new URL("../src/game/galaxy/consts.ts", import.meta.url),
  "utf8",
);
const initialStateSource = await readFile(
  new URL("../src/game/initial/initialState.ts", import.meta.url),
  "utf8",
);
const migrationsSource = await readFile(
  new URL("../src/game/saves/migrations.ts", import.meta.url),
  "utf8",
);
const stationPanelSource = await readFile(
  new URL("../src/game/components/StationPanel.tsx", import.meta.url),
  "utf8",
);
const catalogSource = await readFile(
  new URL("../src/game/components/EnemyCodexPanel.tsx", import.meta.url),
  "utf8",
);
const stationTypesMatch = constsSource.match(
  /export const STATION_TYPES: StationName\[\] = \[([\s\S]*?)\];/,
);
assert.ok(stationTypesMatch, "STATION_TYPES declaration is missing");
const stationTypes = [...stationTypesMatch[1].matchAll(/"([a-z_]+)"/g)].map(
  ([, stationType]) => stationType,
);

assert.deepEqual(
  [...stationTypes].sort(),
  Object.keys(STATION_CONFIG).sort(),
  "Every configured station type must be generated",
);

for (const stationType of stationTypes) {
  const config = STATION_CONFIG[stationType];
  assert.ok(config, `Missing config for ${stationType}`);
  assert.ok(Array.isArray(config.guaranteedModules));
  assert.ok(Array.isArray(config.guaranteedWeapons));
}

const tradeConfig = STATION_CONFIG.trade;
const cargoRate = getStationRates(tradeConfig).find(
  (rate) => rate.key === "cargo_modules",
);
assert.ok(cargoRate, "Trade stations must expose their cargo-module bonus");
assert.equal(getStationRateValue(cargoRate), "+50%");
assert.ok(getStationServiceKeys("trade", tradeConfig).includes("trade"));

const medicalServices = getStationServiceKeys("medical", STATION_CONFIG.medical);
assert.ok(medicalServices.includes("augmentation"));
assert.ok(medicalServices.includes("mutation_cure"));
assert.ok(medicalServices.includes("genetic_therapy"));
const universalServices = getStationServiceKeys("trade", tradeConfig);
assert.ok(universalServices.includes("probes"));
assert.ok(universalServices.includes("scrap"));
assert.ok(universalServices.includes("weapon_removal"));

assert.match(initialStateSource, /discoveredStationTypes: \[\]/);
assert.match(migrationsSource, /visitedStationTypes/);
assert.match(stationPanelSource, /discoverStationType\(stationType\)/);
assert.doesNotMatch(stationPanelSource, /claimHintOnce/);
assert.match(catalogSource, /knownStationTypes\.map/);

console.log("Station discovery checks passed");
