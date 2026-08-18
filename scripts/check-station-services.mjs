import "./register-ts-loader.mjs";
import assert from "node:assert/strict";

const { STATION_CONFIG } = await import("../src/game/galaxy/config.ts");
const { ensureDiplomaticStation } = await import("../src/game/galaxy/ensure.ts");
const { generateStationItems } = await import(
  "../src/game/components/station/station-data.ts"
);
const { refuel } = await import(
  "../src/game/slices/ship/helpers/fuel/refuel.ts"
);
const { installModuleFromCargo } = await import(
  "../src/game/slices/services/helpers/installModuleFromCargo.ts"
);
const { createCraftingSlice } = await import(
  "../src/game/slices/crafting/craftingSlice.ts"
);
const { loadWithMigrations } = await import("../src/game/saves/migrations.ts");
const { RESEARCH_RESOURCES } = await import(
  "../src/game/constants/research/resources.ts"
);
const ru = (await import("../src/lib/locales/ru.json")).default;
const en = (await import("../src/lib/locales/en.json")).default;

const makeStore = (state) => {
  const logs = [];
  state.addLog = (...entry) => logs.push(entry);
  state.updateShipStats = () => {};
  const set = (update) =>
    Object.assign(state, typeof update === "function" ? update(state) : update);
  return { state, set, get: () => state, logs };
};

const moduleCargo = {
  item: "spare_cargo_module",
  quantity: 1,
  isModule: true,
  module: {
    id: "spare_cargo_module",
    type: "module",
    moduleType: "cargo",
    name: "Spare cargo module",
    level: 1,
    price: 1,
    width: 1,
    height: 1,
  },
};

const refuelState = {
  credits: 100,
  crew: [],
  ship: { fuel: 95, maxFuel: 100, modules: [] },
};
const refuelLogs = [];
const refuelResult = refuel(
  refuelState,
  10,
  100,
  (...entry) => refuelLogs.push(entry),
  (update) => Object.assign(refuelState, update(refuelState)),
);
assert.equal(refuelResult.actualAmount, 5);
assert.equal(
  refuelState.credits,
  50,
  "a near-full tank must pay only for fuel that fits",
);

const moduleInSpace = makeStore({
  gameMode: "sector_map",
  currentLocation: {
    type: "station",
    stationType: "shipyard",
    stationConfig: STATION_CONFIG.shipyard,
  },
  research: { researchedTechs: [] },
  ship: { cargo: [structuredClone(moduleCargo)], gridSize: 2, modules: [] },
});
installModuleFromCargo(moduleInSpace.set, moduleInSpace.get, 0, 0, 0);
assert.equal(
  moduleInSpace.state.ship.modules.length,
  0,
  "cargo modules must not install outside a shipyard",
);

const weaponInSpace = makeStore({
  gameMode: "sector_map",
  currentLocation: {
    type: "station",
    stationType: "military",
    stationConfig: STATION_CONFIG.military,
  },
  ship: {
    cargo: [
      {
        item: "crafted_weapon_plasma",
        quantity: 1,
        isCraftedWeapon: true,
        weaponType: "plasma",
      },
    ],
    modules: [{ id: 1, type: "weaponbay", health: 100, weapons: [null] }],
  },
});
createCraftingSlice(weaponInSpace.set, weaponInSpace.get).installCraftedWeapon(0, 1);
assert.equal(
  weaponInSpace.state.ship.modules[0].weapons[0],
  null,
  "cargo weapons must not install outside a military station",
);

const moduleAtShipyard = makeStore({
  gameMode: "station",
  currentLocation: {
    type: "station",
    stationType: "shipyard",
    stationConfig: STATION_CONFIG.shipyard,
  },
  research: { researchedTechs: [] },
  ship: { cargo: [structuredClone(moduleCargo)], gridSize: 2, modules: [] },
});
installModuleFromCargo(moduleAtShipyard.set, moduleAtShipyard.get, 0, 0, 0);
assert.equal(moduleAtShipyard.state.ship.modules.length, 1);

const weaponAtMilitary = makeStore({
  gameMode: "station",
  currentLocation: {
    type: "station",
    stationType: "military",
    stationConfig: STATION_CONFIG.military,
  },
  ship: {
    cargo: [
      {
        item: "crafted_weapon_plasma",
        quantity: 1,
        isCraftedWeapon: true,
        weaponType: "plasma",
      },
    ],
    modules: [{ id: 1, type: "weaponbay", health: 100, weapons: [null] }],
  },
});
createCraftingSlice(weaponAtMilitary.set, weaponAtMilitary.get).installCraftedWeapon(0, 1);
assert.deepEqual(weaponAtMilitary.state.ship.modules[0].weapons[0], {
  type: "plasma",
});

assert.equal(STATION_CONFIG.military.allowsWeaponCraft, true);
assert.equal(STATION_CONFIG.military.allowsModuleCraft, false);
assert.equal(STATION_CONFIG.military.allowsWeaponInstall, true);
assert.equal(STATION_CONFIG.shipyard.allowsWeaponCraft, false);
assert.equal(STATION_CONFIG.shipyard.allowsModuleCraft, true);
assert.equal(STATION_CONFIG.shipyard.allowsWeaponInstall, false);

for (const stationType of [
  "trade",
  "military",
  "research",
  "mining",
  "shipyard",
  "medical",
  "diplomatic",
]) {
  const config = STATION_CONFIG[stationType];
  const items = generateStationItems(`${stationType}-role-check`, 2, config);
  assert.ok(
    items
      .filter((item) => item.type === "module")
      .every((item) => config.guaranteedModules.includes(item.moduleType)),
    `${stationType}: module stock must stay within its specialty`,
  );
  assert.ok(
    items
      .filter((item) => item.type === "weapon")
      .every((item) => config.guaranteedWeapons.includes(item.weaponType)),
    `${stationType}: weapon stock must stay within its specialty`,
  );
  assert.equal(
    items.some((item) => item.type === "upgrade"),
    stationType === "shipyard",
    `${stationType}: only a shipyard sells module upgrades`,
  );
}

const sectors = [
  {
    id: 1,
    tier: 1,
    star: { type: "red_dwarf", name: "star_types.red_dwarf" },
    locations: [
      {
        id: "diplomatic-fixture",
        type: "station",
        stationType: "trade",
        stationConfig: STATION_CONFIG.trade,
        dominantRace: "human",
      },
    ],
  },
];
ensureDiplomaticStation(sectors);
const diplomatic = sectors[0].locations[0];
assert.equal(diplomatic.stationType, "diplomatic");
assert.equal(
  diplomatic.dominantRace,
  undefined,
  "a diplomatic station must remain neutral and dockable",
);

const legacyDiplomatic = {
  id: "legacy-diplomatic",
  type: "station",
  stationType: "diplomatic",
  stationConfig: STATION_CONFIG.diplomatic,
  dominantRace: "human",
};
const legacyTrade = {
  id: "legacy-trade",
  type: "station",
  stationType: "trade",
  stationConfig: { ...STATION_CONFIG.trade, guaranteedWeapons: ["missile"] },
};
const migrated = loadWithMigrations(
  JSON.stringify({
    version: 32,
    state: {
      galaxy: {
        sectors: [{ id: 1, locations: [legacyDiplomatic, legacyTrade] }],
      },
      currentSector: { id: 1, locations: [legacyDiplomatic, legacyTrade] },
      currentLocation: legacyDiplomatic,
    },
  }),
);
assert.equal(
  migrated?.currentLocation?.dominantRace,
  undefined,
  "existing diplomatic stations must become neutral on load",
);
assert.deepEqual(
  migrated?.galaxy?.sectors[0]?.locations[1]?.stationConfig?.guaranteedWeapons,
  [],
  "saved station profiles must receive their current specialized stock",
);

for (const locale of [ru, en]) {
  assert.equal(typeof locale.services.probes_title, "string");
  assert.equal(typeof locale.services.probes_onboard, "string");
  assert.equal(typeof locale.services.probes_price_desc, "string");
  assert.equal(typeof locale.services.research_sell_title, "string");
  assert.equal(typeof locale.services.research_sell_desc, "string");
  assert.equal(typeof locale.services.research_sell_empty, "string");
  assert.equal(typeof locale.services.research_unit_price, "string");
  assert.equal(typeof locale.services.all, "string");
  for (const resourceId of Object.keys(RESEARCH_RESOURCES)) {
    assert.equal(
      typeof locale.research.resources[resourceId]?.name,
      "string",
      `${resourceId}: research resource name must be localized`,
    );
  }
}

console.log("Station service checks passed");
