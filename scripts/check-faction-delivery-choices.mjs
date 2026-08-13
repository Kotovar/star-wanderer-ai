import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const scriptPath = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(scriptPath), "..");
const jiti = require("jiti")(scriptPath, {
  alias: { "@": path.join(root, "src") },
});

const { generatePlanetContracts } = jiti(
  "../src/game/contracts/generatePlanetContracts.ts",
);
const { loadWithMigrations } = jiti("../src/game/saves/migrations.ts");
const {
  getFactionDeliveryContext,
  getFactionDeliveryReward,
  getValidPendingContractDecision,
} = jiti("../src/game/contracts/factionDelivery.ts");

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

const humanSource = {
  id: 1,
  name: "Human source",
  tier: 1,
  locations: [
    {
      id: "human-source",
      type: "planet",
      name: "Human source",
      planetType: "Пустынная",
      dominantRace: "human",
    },
  ],
};

const syntheticTarget = {
  id: 2,
  name: "Synthetic target",
  tier: 1,
  locations: [
    {
      id: "synthetic-target",
      type: "planet",
      name: "Synthetic target",
      planetType: "Ледяная",
      dominantRace: "synthetic",
    },
  ],
};

const humanTarget = {
  ...syntheticTarget,
  id: 3,
  locations: [
    {
      ...syntheticTarget.locations[0],
      id: "human-target",
      dominantRace: "human",
    },
  ],
};

const stationTarget = {
  ...syntheticTarget,
  id: 4,
  locations: [
    {
      id: "station-target",
      type: "station",
      name: "Station target",
    },
  ],
};

const generateDelivery = (target, decisionRoll, context) =>
  withRandomSequence(
    [0, 0.99, 0.21, 0, 0, 0, decisionRoll, 0, 0],
    () =>
      generatePlanetContracts(
        "Пустынная",
        humanSource,
        "human-source",
        0,
        [humanSource, target],
        "human",
        null,
        context,
      ).find((contract) => contract.type === "delivery"),
  );

assert.equal(getFactionDeliveryReward(999), 649);
assert.equal(getFactionDeliveryContext("fuel"), "relief");
assert.equal(getFactionDeliveryContext("spares"), "relief");
assert.equal(getFactionDeliveryContext("construction_materials"), "reconstruction");
assert.equal(getFactionDeliveryContext("scientific_equipment"), "research_access");
assert.equal(getFactionDeliveryContext("diplomatic_cargo"), "diplomatic_claim");

assert.deepEqual(
  generateDelivery(syntheticTarget, 0.34, {
    canOfferCombat: true,
    allowFrontier: false,
  })?.factionDelivery,
  { localRace: "synthetic", context: "relief" },
  "eligible cross-faction planet delivery should reveal a faction decision",
);
assert.equal(
  generateDelivery(syntheticTarget, 0.35, {
    canOfferCombat: true,
    allowFrontier: false,
  })?.factionDelivery,
  undefined,
  "the 35% boundary must not create a faction decision",
);
assert.equal(
  generateDelivery(humanTarget, 0, {
    canOfferCombat: true,
    allowFrontier: false,
  })?.factionDelivery,
  undefined,
  "same-race delivery must stay ordinary",
);
assert.equal(
  generateDelivery(stationTarget, 0, {
    canOfferCombat: true,
    allowFrontier: false,
  })?.factionDelivery,
  undefined,
  "station delivery must stay ordinary",
);
assert.equal(
  generateDelivery(syntheticTarget, 0, {
    canOfferCombat: true,
    allowFrontier: true,
  })?.factionDelivery,
  undefined,
  "Frontier delivery must not receive a faction decision",
);

const legacy = loadWithMigrations(
  JSON.stringify({
    version: 25,
    state: { ship: { modules: [] }, activeContracts: [] },
  }),
);
assert.equal(
  legacy?.pendingContractDecision,
  null,
  "version-25 saves must initialize the pending faction decision",
);
assert.deepEqual(
  getValidPendingContractDecision(
    { contractId: "valid" },
    [
      {
        id: "valid",
        type: "delivery",
        factionDelivery: { localRace: "synthetic", context: "relief" },
      },
    ],
  ),
  { contractId: "valid" },
);
assert.equal(
  getValidPendingContractDecision(
    { contractId: "wrong-type" },
    [
      {
        id: "wrong-type",
        type: "combat",
        factionDelivery: { localRace: "synthetic", context: "relief" },
      },
    ],
  ),
  null,
  "metadata on a non-delivery contract must not reopen a faction decision",
);
assert.equal(
  getValidPendingContractDecision({ contractId: "stale" }, []),
  null,
  "a missing delivery must not reopen a stale decision",
);

const { setUiState } = await import("./register-ui-loader.mjs");
const { createContractsSlice } = await import(
  "../src/game/slices/contracts/contractsSlice.ts"
);

const makeDecisionState = () => {
  const contract = {
    id: "choice-delivery",
    type: "delivery",
    reward: 1000,
    cargo: "fuel",
    targetLocationId: "synthetic-target",
    sourceDominantRace: "human",
    factionDelivery: { localRace: "synthetic", context: "relief" },
  };
  const reputationCalls = [];
  const state = {
    activeContracts: [contract],
    completedContractIds: [],
    pendingContractCompletions: [],
    pendingContractDecision: null,
    currentLocation: { id: "synthetic-target", type: "planet" },
    ship: { cargo: [{ item: "fuel", quantity: 10, contractId: contract.id }] },
    credits: 100,
    crew: [],
    raceReputation: { human: 0, synthetic: 0 },
    frontierChainClosed: false,
    frontierContractsCompleted: 0,
    addLog: () => {},
    gainExp: () => undefined,
    changeReputation: (raceId, amount) => {
      reputationCalls.push({ raceId, amount });
      state.raceReputation[raceId] = (state.raceReputation[raceId] ?? 0) + amount;
    },
  };
  const set = (update) => {
    const patch = typeof update === "function" ? update(state) : update;
    if (patch) Object.assign(state, patch);
    setUiState(state);
  };
  Object.assign(state, createContractsSlice(set, () => state));
  setUiState(state);
  return { contract, reputationCalls, state };
};

const issuer = makeDecisionState();
issuer.state.completeDeliveryContract(issuer.contract.id);
assert.deepEqual(
  issuer.state.pendingContractDecision,
  { contractId: issuer.contract.id },
  "reaching a faction delivery should wait for the player's choice",
);
assert.equal(issuer.state.credits, 100);
assert.equal(issuer.state.ship.cargo.length, 1);
assert.equal(issuer.state.activeContracts.length, 1);

issuer.state.resolveFactionDeliveryDecision("issuer");
assert.equal(issuer.state.credits, 1100);
assert.deepEqual(issuer.reputationCalls, [{ raceId: "human", amount: 2 }]);
assert.equal(issuer.state.ship.cargo.length, 0);
assert.equal(issuer.state.pendingContractDecision, null);
assert.equal(issuer.state.pendingContractCompletions[0].credits, 1000);

const local = makeDecisionState();
local.state.completeDeliveryContract(local.contract.id);
local.state.resolveFactionDeliveryDecision("local");
assert.equal(local.state.credits, 750);
assert.deepEqual(local.reputationCalls, [
  { raceId: "human", amount: -4 },
  { raceId: "synthetic", amount: 4 },
]);
assert.equal(local.state.pendingContractCompletions[0].credits, 650);

const localSnapshot = {
  credits: local.state.credits,
  cargo: local.state.ship.cargo.length,
  completions: local.state.pendingContractCompletions.length,
  reputationCalls: local.reputationCalls.length,
};
local.state.resolveFactionDeliveryDecision("local");
assert.deepEqual(
  {
    credits: local.state.credits,
    cargo: local.state.ship.cargo.length,
    completions: local.state.pendingContractCompletions.length,
    reputationCalls: local.reputationCalls.length,
  },
  localSnapshot,
  "resolving a delivery twice must not award it twice",
);

const mismatched = makeDecisionState();
mismatched.state.completeDeliveryContract(mismatched.contract.id);
mismatched.state.currentLocation = { id: "other-planet", type: "planet" };
mismatched.state.resolveFactionDeliveryDecision("issuer");
assert.equal(mismatched.state.pendingContractDecision, null);
assert.equal(mismatched.state.credits, 100);
assert.equal(mismatched.state.ship.cargo.length, 1);
assert.equal(mismatched.state.activeContracts.length, 1);

const ordinary = makeDecisionState();
delete ordinary.contract.factionDelivery;
ordinary.state.completeDeliveryContract(ordinary.contract.id);
assert.equal(ordinary.state.pendingContractDecision, null);
assert.equal(ordinary.state.credits, 1100);
assert.deepEqual(ordinary.reputationCalls, [{ raceId: "human", amount: 2 }]);
assert.equal(ordinary.state.pendingContractCompletions[0].credits, 1000);

const storage = new Map();
globalThis.window = {};
globalThis.localStorage = {
  getItem: (key) => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, String(value)),
  removeItem: (key) => storage.delete(key),
};

const [{ initialState }, { createGameManagementSlice }] = await Promise.all([
  import("../src/game/initial/initialState.ts"),
  import("../src/game/slices/gameManagement/gameManagementSlice.ts"),
]);
const savedDelivery = {
  id: "saved-choice-delivery",
  type: "delivery",
  reward: 1000,
  cargo: "fuel",
  targetLocationId: "saved-target",
  sourceDominantRace: "human",
  factionDelivery: { localRace: "synthetic", context: "relief" },
};
const makeSavedGame = (activeContracts, pendingContractDecision) => {
  const saved = structuredClone(initialState);
  saved.activeContracts = activeContracts;
  saved.pendingContractDecision = pendingContractDecision;
  saved.currentLocation = {
    id: "saved-target",
    type: "planet",
    name: "Saved target",
  };
  saved.ship = {
    ...saved.ship,
    cargo: [{ item: "fuel", quantity: 10, contractId: "saved-choice-delivery" }],
  };
  return saved;
};
const makeManagementState = () => {
  const state = structuredClone(initialState);
  state.addLog = () => {};
  state.updateShipStats = () => {};
  const set = (update) => {
    const patch = typeof update === "function" ? update(state) : update;
    if (patch) Object.assign(state, patch);
  };
  Object.assign(state, createGameManagementSlice(set, () => state));
  return state;
};
const saveState = (state) =>
  JSON.stringify({ version: 26, state });

storage.set(
  "star-wanderer-save",
  saveState(
    makeSavedGame([savedDelivery], { contractId: "saved-choice-delivery" }),
  ),
);
const autoLoad = makeManagementState();
assert.equal(autoLoad.loadGame(), true);
assert.deepEqual(
  autoLoad.pendingContractDecision,
  { contractId: "saved-choice-delivery" },
  "a valid decision must reopen after loading the auto save",
);

storage.set(
  "star-wanderer-save-1",
  saveState(
    makeSavedGame([], { contractId: "missing-choice-delivery" }),
  ),
);
const slotLoad = makeManagementState();
slotLoad.loadFromSlot("manual1");
assert.equal(
  slotLoad.pendingContractDecision,
  null,
  "a stale decision must be cleared when loading a manual slot",
);

const modalSource = readFileSync(
  new URL("../src/game/components/FactionDeliveryDecisionModal.tsx", import.meta.url),
  "utf8",
);
const pageSource = readFileSync(
  new URL("../src/app/page.tsx", import.meta.url),
  "utf8",
);
const ru = JSON.parse(
  readFileSync(new URL("../src/lib/locales/ru.json", import.meta.url), "utf8"),
);
const en = JSON.parse(
  readFileSync(new URL("../src/lib/locales/en.json", import.meta.url), "utf8"),
);

assert.match(modalSource, /showCloseButton={false}/);
assert.match(modalSource, /onEscapeKeyDown={[\s\S]*preventDefault/);
assert.match(modalSource, /onInteractOutside={[\s\S]*preventDefault/);
assert.match(modalSource, /resolveFactionDeliveryDecision\("issuer"/);
assert.match(modalSource, /resolveFactionDeliveryDecision\("local"/);
assert.match(pageSource, /FactionDeliveryDecisionModal/);
assert.equal(ru.contracts.faction_delivery.issuer_action, "Выполнить хартию");
assert.equal(ru.contracts.faction_delivery.local_action, "Передать местным");
assert.equal(en.contracts.faction_delivery.issuer_action, "Honor the charter");
assert.equal(en.contracts.faction_delivery.local_action, "Hand it to the locals");
assert.match(ru.contracts.faction_delivery.local_outcome, /65%[\s\S]*\+4[\s\S]*-4/);
assert.match(en.contracts.faction_delivery.local_outcome, /65%[\s\S]*\+4[\s\S]*-4/);

console.log("faction delivery choice checks passed");
