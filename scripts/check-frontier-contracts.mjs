import assert from "node:assert/strict";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const scriptPath = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(scriptPath), "..");
const jiti = require("jiti")(scriptPath, { alias: { "@": path.join(root, "src") } });
const { hasCombatArmament } = jiti("../src/game/contracts/frontierContracts.ts");
const { generateGalaxy } = jiti("../src/game/galaxy/generateGalaxy.ts");
const { loadWithMigrations } = jiti("../src/game/saves/migrations.ts");

const armedModules = [{ type: "weaponbay", weapons: [{ type: "laser" }], health: 100 }];

assert.equal(hasCombatArmament(armedModules), true);
assert.equal(
  hasCombatArmament([{ type: "weaponbay", weapons: [{ type: "laser" }], health: 0 }]),
  false,
);
assert.equal(
  hasCombatArmament([{ type: "weaponbay", weapons: [null], health: 100 }]),
  false,
);

const legacy = loadWithMigrations(JSON.stringify({
  version: 24,
  state: { ship: { modules: armedModules } },
}));
assert.equal(legacy?.frontierContractsCompleted, 0);
assert.equal(legacy?.frontierChainClosed, true);
assert.equal(legacy?.frontierCombatOffersSeeded, true);
assert.equal(legacy?.frontierSubsidy, null);

for (let run = 0; run < 16; run += 1) {
  const militaryStations = generateGalaxy()
    .filter((sector) => sector.tier === 1)
    .flatMap((sector) => sector.locations)
    .filter((location) => location.type === "station" && location.stationType === "military");

  assert.ok(militaryStations.length, "each tier-1 galaxy needs a military station");
  assert.ok(militaryStations.some((station) => {
    const inventory = station.stationConfig;
    return inventory?.guaranteedModules.includes("weaponbay") &&
      inventory.guaranteedWeapons.includes("kinetic") &&
      inventory.guaranteedWeapons.includes("laser");
  }), "tier-1 military station needs a weapon bay, kinetic weapon, and laser weapon");
}

console.log("frontier contract foundation checks passed");
