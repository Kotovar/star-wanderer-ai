import assert from "node:assert/strict";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const scriptPath = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(scriptPath), "..");
const jiti = require("jiti")(scriptPath, { alias: { "@": path.join(root, "src") } });
const { hasCombatArmament } = jiti("../src/game/contracts/frontierContracts.ts");
const { generatePlanetContracts } = jiti("../src/game/contracts/generatePlanetContracts.ts");
const { getContractReputationImpact } = jiti("../src/game/reputation/utils.ts");
const { generateGalaxy } = jiti("../src/game/galaxy/generateGalaxy.ts");
const { loadWithMigrations } = jiti("../src/game/saves/migrations.ts");
await import("./register-ts-loader.mjs");
const { generateStationItems } = await import("../src/game/components/station/station-data.ts");
const { refreshVisitedPlanetContracts } = await import("../src/game/contracts/refreshPlanetContracts.ts");
const { createShopSlice } = await import("../src/game/slices/shop/createShopSlice.ts");
const { createCraftingSlice } = await import("../src/game/slices/crafting/craftingSlice.ts");

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

const withRandomSequence = (values, callback) => {
  const originalRandom = Math.random;
  let index = 0;
  Math.random = () => values[index++] ?? 0;
  try {
    return callback();
  } finally {
    Math.random = originalRandom;
  }
};

const combatSource = {
  id: 1,
  name: "Krylorean source",
  tier: 1,
  locations: [
    {
      id: "kryl-source",
      type: "planet",
      name: "Krylorean source",
      planetType: "Пустынная",
      dominantRace: "krylorian",
    },
  ],
};
const combatTarget = {
  id: 2,
  name: "Enemy target",
  tier: 1,
  locations: [
    { id: "enemy-target", type: "enemy", threat: 2 },
    {
      id: "scan-target",
      type: "planet",
      name: "Scan target",
      planetType: "Ледяная",
    },
  ],
};
const combatSectors = [combatSource, combatTarget];
const combatSequence = [0.9, 0.1, 0, 0, 0, 0.35, 0, 0, 0, 0];
const unarmedOffers = withRandomSequence(combatSequence, () =>
  generatePlanetContracts(
    "Пустынная",
    combatSource,
    "kryl-source",
    0,
    combatSectors,
    "krylorian",
    null,
    { canOfferCombat: false, allowFrontier: false },
  ),
);
assert.equal(
  unarmedOffers.some((contract) =>
    contract.type === "combat" || contract.type === "bounty",
  ),
  false,
  "unarmed board must contain no combat or bounty offer",
);
assert.equal(
  unarmedOffers.some((contract) => contract.isRaceQuest && contract.type === "combat"),
  false,
  "unarmed board must suppress the Krylorean combat quest",
);
const armedOfferSets = [
  withRandomSequence(combatSequence, () =>
    generatePlanetContracts(
      "Пустынная",
      combatSource,
      "kryl-source",
      0,
      combatSectors,
      "krylorian",
      null,
      { canOfferCombat: true, allowFrontier: false },
    ),
  ),
];
assert.ok(
  armedOfferSets.some((offers) =>
    offers.some((contract) => contract.type === "combat" || contract.type === "bounty"),
  ),
  "armed generator must retain normal combat availability",
);

const frontierOffers = withRandomSequence([0.1, 0.1, 0, 0, 0], () =>
  generatePlanetContracts(
    "Пустынная",
    combatSource,
    "kryl-source",
    0,
    combatSectors,
    undefined,
    null,
    { canOfferCombat: true, allowFrontier: true },
  ),
);
assert.ok(
  frontierOffers.some(
    (contract) =>
      contract.progressionTrack === "frontier" &&
      !contract.isRaceQuest &&
      !["combat", "bounty"].includes(contract.type),
  ),
);

const bountySequence = [0.1, 0.9, 0.55, 0, 0, 0, 0.4];
const normalBounty = withRandomSequence(bountySequence, () =>
  generatePlanetContracts(
    "Пустынная",
    combatSource,
    "kryl-source",
    0,
    combatSectors,
    "human",
    null,
    { canOfferCombat: true, allowFrontier: false, sourceReputation: 0 },
  ).find((contract) => contract.type === "bounty"),
);
const friendlyBounty = withRandomSequence(bountySequence, () =>
  generatePlanetContracts(
    "Пустынная",
    combatSource,
    "kryl-source",
    0,
    combatSectors,
    "human",
    null,
    { canOfferCombat: true, allowFrontier: false, sourceReputation: 11 },
  ).find((contract) => contract.type === "bounty"),
);
assert.ok(normalBounty, "normal bounty fixture must generate a bounty");
assert.ok(friendlyBounty, "friendly bounty fixture must generate a bounty");
assert.equal(friendlyBounty.reward, Math.floor(normalBounty.reward * 1.25));
assert.equal(friendlyBounty.bountyTier, "friendly");
assert.equal(friendlyBounty.reputationReward, 4);
assert.deepEqual(getContractReputationImpact(friendlyBounty), [
  { raceId: "human", change: 4 },
  { raceId: "synthetic", change: -1 },
  { raceId: "crystalline", change: 1 },
]);

const isCombatOffer = (contract) =>
  contract.type === "combat" || contract.type === "bounty";
const ordinaryContract = (id) => ({
  id,
  type: "supply_run",
  desc: "ordinary",
  reward: 1,
});
const raceContract = (id) => ({
  id,
  type: "diplomacy",
  desc: "race",
  reward: 1,
  isRaceQuest: true,
});

const visitedWithTarget = {
  id: "visited-target",
  type: "planet",
  name: "Visited target",
  planetType: "Пустынная",
  dominantRace: "human",
  visited: true,
  contracts: [
    raceContract("target-race-1"),
    raceContract("target-race-2"),
    raceContract("target-race-3"),
    ordinaryContract("target-ordinary"),
  ],
};
const fullBoard = {
  id: "full-board",
  type: "planet",
  name: "Full board",
  planetType: "Пустынная",
  dominantRace: "human",
  visited: true,
  contracts: [
    ordinaryContract("full-ordinary"),
    raceContract("full-race"),
    {
      id: "full-crisis",
      type: "crisis_response",
      desc: "crisis",
      reward: 1,
      crisisId: "epidemic",
    },
    {
      id: "full-fabrication",
      type: "fabrication",
      desc: "fabrication",
      reward: 1,
      requiredWeaponType: "plasma",
    },
    raceContract("full-race-2"),
  ],
};
const unvisited = {
  id: "unvisited-board",
  type: "planet",
  name: "Unvisited board",
  planetType: "Пустынная",
  visited: false,
  contracts: [ordinaryContract("unvisited")],
};
const emptyPlanet = {
  id: "empty-board",
  type: "planet",
  name: "Empty board",
  planetType: "Пустынная",
  isEmpty: true,
  visited: true,
  contracts: [ordinaryContract("empty")],
};
const noEnemyBoard = {
  id: "no-enemy-board",
  type: "planet",
  name: "No enemy board",
  planetType: "Пустынная",
  visited: true,
  contracts: [
    raceContract("no-enemy-1"),
    raceContract("no-enemy-2"),
    raceContract("no-enemy-3"),
    raceContract("no-enemy-4"),
    raceContract("no-enemy-5"),
  ],
};
const existingCombatBoard = {
  id: "existing-combat-board",
  type: "planet",
  name: "Existing combat board",
  planetType: "Пустынная",
  visited: true,
  contracts: [
    { ...ordinaryContract("existing-combat"), type: "combat", sectorId: 2 },
    raceContract("existing-race-1"),
    raceContract("existing-race-2"),
    raceContract("existing-race-3"),
    raceContract("existing-race-4"),
  ],
};
const originalUnvisitedContracts = structuredClone(unvisited.contracts);
const originalEmptyContracts = structuredClone(emptyPlanet.contracts);
const originalNoEnemyContracts = structuredClone(noEnemyBoard.contracts);
const refreshState = {
  activeContracts: [],
  activeCrisis: { id: "epidemic", turnsRemaining: 10 },
  artifacts: [],
  completedContractIds: [],
  completedLocations: [],
  galaxy: {
    sectors: [
      {
        id: 1,
        name: "Source sector",
        tier: 1,
        locations: [visitedWithTarget, fullBoard, unvisited, emptyPlanet, existingCombatBoard],
      },
      {
        id: 2,
        name: "Enemy sector",
        tier: 1,
        locations: [
          { id: "enemy-target", type: "enemy", threat: 2 },
          noEnemyBoard,
        ],
      },
    ],
  },
  raceReputation: { human: 51 },
  research: { researchedTechs: [], unlockedRecipes: ["plasma"] },
  runProfileId: null,
  ship: { modules: armedModules },
  frontierChainClosed: false,
  frontierCombatOffersSeeded: false,
};
const refreshedSectors = withRandomSequence([0.99, 0.99, 0.99], () =>
  refreshVisitedPlanetContracts(refreshState, { ensureCombatOffer: true }),
);
assert.ok(refreshedSectors, "armed first refresh must update visited boards");
const refreshedLocations = refreshedSectors.flatMap((sector) => sector.locations);
const refreshedTargetBoard = refreshedLocations.find((location) => location.id === visitedWithTarget.id);
const refreshedFullBoard = refreshedLocations.find((location) => location.id === fullBoard.id);
const refreshedUnvisited = refreshedLocations.find((location) => location.id === unvisited.id);
const refreshedEmptyPlanet = refreshedLocations.find((location) => location.id === emptyPlanet.id);
const refreshedNoEnemyBoard = refreshedLocations.find((location) => location.id === noEnemyBoard.id);
const refreshedExistingCombatBoard = refreshedLocations.find((location) => location.id === existingCombatBoard.id);
assert.equal(refreshedTargetBoard.contracts.filter(isCombatOffer).length, 1);
assert.equal(refreshedFullBoard.contracts.length, 5);
assert.ok(refreshedFullBoard.contracts.some((contract) => contract.isRaceQuest));
assert.ok(refreshedFullBoard.contracts.some((contract) => contract.type === "crisis_response"));
assert.ok(refreshedFullBoard.contracts.some((contract) => contract.type === "fabrication"));
assert.deepEqual(refreshedUnvisited.contracts, originalUnvisitedContracts);
assert.deepEqual(refreshedEmptyPlanet.contracts, originalEmptyContracts);
assert.deepEqual(refreshedNoEnemyBoard.contracts, originalNoEnemyContracts);
assert.equal(refreshedExistingCombatBoard.contracts.filter(isCombatOffer).length, 1);

const makeStoreStub = (state) => {
  let syncCalls = 0;
  state.addLog = () => {};
  state.updateShipStats = () => {};
  state.syncCombatContractOffers = () => { syncCalls += 1; };
  const set = (update) => Object.assign(state, typeof update === "function" ? update(state) : update);
  return { state, set, get: () => state, syncCalls: () => syncCalls };
};
const weaponItem = { id: "laser", type: "weapon", price: 10, stock: 1, weaponType: "laser" };
const successfulPurchase = makeStoreStub({
  credits: 100,
  currentLocation: { stationId: "military" },
  stationInventory: { military: {} },
  ship: { modules: [{ id: 1, type: "weaponbay", health: 100, weapons: [null] }] },
});
createShopSlice(successfulPurchase.set, successfulPurchase.get).buyItem(weaponItem);
assert.equal(successfulPurchase.syncCalls(), 1, "weapon purchase must sync once after install");
const noSlotPurchase = makeStoreStub({
  credits: 100,
  currentLocation: { stationId: "military" },
  stationInventory: { military: {} },
  ship: { modules: [{ id: 1, type: "weaponbay", health: 100, weapons: [{ type: "laser" }] }] },
});
createShopSlice(noSlotPurchase.set, noSlotPurchase.get).buyItem(weaponItem);
assert.equal(noSlotPurchase.syncCalls(), 0, "full weapon bay must not sync");
const successfulCraft = makeStoreStub({
  ship: {
    cargo: [{ item: "crafted_weapon_plasma", quantity: 1, isCraftedWeapon: true, weaponType: "plasma" }],
    modules: [{ id: 1, type: "weaponbay", health: 100, weapons: [null] }],
  },
});
createCraftingSlice(successfulCraft.set, successfulCraft.get).installCraftedWeapon(0, 1);
assert.equal(successfulCraft.syncCalls(), 1, "crafted weapon install must sync once");
const noSlotCraft = makeStoreStub({
  ship: {
    cargo: [{ item: "crafted_weapon_plasma", quantity: 1, isCraftedWeapon: true, weaponType: "plasma" }],
    modules: [{ id: 1, type: "weaponbay", health: 100, weapons: [{ type: "laser" }] }],
  },
});
createCraftingSlice(noSlotCraft.set, noSlotCraft.get).installCraftedWeapon(0, 1);
assert.equal(noSlotCraft.syncCalls(), 0, "full crafted-weapon bay must not sync");

for (let run = 0; run < 16; run += 1) {
  const militaryStations = generateGalaxy()
    .filter((sector) => sector.tier === 1)
    .flatMap((sector) => sector.locations)
    .filter((location) => location.type === "station" && location.stationType === "military");

  assert.ok(militaryStations.length, "each tier-1 galaxy needs a military station");
  assert.ok(militaryStations.some((station) => {
    const inventory = generateStationItems(
      station.stationId ?? station.id,
      1,
      station.stationConfig,
    );
    return inventory.some((item) => item.moduleType === "weaponbay") &&
      inventory.some((item) => item.weaponType === "kinetic") &&
      inventory.some((item) => item.weaponType === "laser");
  }), "tier-1 military station needs a weapon bay, kinetic weapon, and laser weapon");
}

console.log("frontier contract foundation checks passed");
