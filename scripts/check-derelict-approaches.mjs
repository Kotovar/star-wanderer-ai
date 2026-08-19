import assert from "node:assert/strict";
import "./register-ui-loader.mjs";
import {
  DERELICT_APPROACH_CONFIG,
  DERELICT_RISK_CHANCE,
} from "../src/game/slices/locations/constants.ts";
import { readFileSync } from "node:fs";

const { generateDerelictShip } = await import(
  "../src/game/galaxy/generate.ts"
);
const { createLocationsSlice } = await import(
  "../src/game/slices/locations/createLocationsSlice.ts"
);

const generatedDerelicts = [
  generateDerelictShip(1, 1),
  generateDerelictShip(1, 2),
  generateDerelictShip(1, 3),
];
const derelictProfiles = new Set(["military", "industrial", "research"]);
assert.ok(
  generatedDerelicts.every((location) =>
    derelictProfiles.has(location.derelictProfile),
  ),
  "every newly generated derelict must expose a readable profile",
);
assert.equal(
  generateDerelictShip(4, 7).derelictProfile,
  generateDerelictShip(4, 7).derelictProfile,
  "a derelict profile must stay stable for the same sector location",
);
assert.equal(
  new Set(generatedDerelicts.map((location) => location.derelictProfile)).size,
  3,
  "nearby derelicts must not all resolve into the same profile",
);

const createDiscoveryHarness = ({
  profile = "military",
  moduleType = "engine",
  moduleHealth = 100,
  scoutHealth = 100,
  explored = true,
} = {}) => {
  const derelict = {
    id: "profile-derelict",
    name: "Profile test",
    type: "derelict_ship",
    derelictProfile: profile,
    derelictExplored: explored,
    derelictLoot: { approach: "boarding", spares: 2 },
  };
  const sector = { id: 1, locations: [derelict] };
  let state = {
    currentLocation: derelict,
    currentSector: sector,
    galaxy: { sectors: [sector] },
    crew: [
      {
        id: 1,
        name: "Scout",
        race: "human",
        profession: "scout",
        health: scoutHealth,
        maxHealth: 100,
        level: 1,
      },
    ],
    ship: {
      modules: [
        {
          id: 7,
          name: "Test module",
          type: moduleType,
          health: moduleHealth,
        },
      ],
      cargo: [],
      tradeGoods: [],
    },
    research: { resources: {}, researchedTechs: [] },
    moduleRecipes: [],
    activeContracts: [],
    startModifierIds: [],
    credits: 1000,
    turn: 3,
    addLog: () => {},
    updateShipStats: () => {},
    gainExp: () => {},
    checkGameOver: () => {},
  };
  const set = (updater) => {
    const patch = typeof updater === "function" ? updater(state) : updater;
    state = { ...state, ...patch };
  };
  return {
    actions: createLocationsSlice(set, () => state),
    state: () => state,
  };
};

const deepHarness = createDiscoveryHarness();
const random = Math.random;
Math.random = () => 0.9;
try {
  assert.doesNotThrow(
    () => deepHarness.actions.resolveDerelictDiscovery("profile-derelict", "deepen"),
    "a discovered compartment must resolve without a second base search",
  );
} finally {
  Math.random = random;
}
assert.equal(deepHarness.state().turn, 4, "deepening must spend one additional turn");
assert.equal(deepHarness.state().credits, 1200, "military black box must pay 200 credits");
assert.equal(
  deepHarness.state().research.resources.tech_salvage,
  1,
  "military black box must grant tech salvage",
);
assert.equal(
  deepHarness.state().currentLocation.derelictLoot.discovery.choice,
  "deepen",
  "the deep decision must persist on the derelict",
);

const secureHarness = createDiscoveryHarness();
secureHarness.actions.resolveDerelictDiscovery("profile-derelict", "secure");
assert.equal(secureHarness.state().turn, 3, "securing base loot must not spend a turn");
assert.equal(secureHarness.state().credits, 1000, "securing must preserve base rewards only");
assert.equal(
  secureHarness.state().currentLocation.derelictLoot.discovery.choice,
  "secure",
  "the secure decision must persist on the derelict",
);

const militaryRiskHarness = createDiscoveryHarness({ moduleHealth: 80 });
Math.random = () => 0;
try {
  militaryRiskHarness.actions.resolveDerelictDiscovery(
    "profile-derelict",
    "deepen",
  );
} finally {
  Math.random = random;
}
assert.equal(
  militaryRiskHarness.state().ship.modules[0].health,
  0,
  "a military black-box trap must disable the affected active module",
);

const industrialRiskHarness = createDiscoveryHarness({
  profile: "industrial",
  scoutHealth: 72,
});
Math.random = () => 0;
try {
  industrialRiskHarness.actions.resolveDerelictDiscovery(
    "profile-derelict",
    "deepen",
  );
} finally {
  Math.random = random;
}
assert.equal(
  industrialRiskHarness.state().crew.length,
  0,
  "an industrial decompression must kill the scout",
);

const fatalBaseSearchHarness = createDiscoveryHarness({
  explored: false,
  scoutHealth: 1,
});
Math.random = () => 0;
try {
  fatalBaseSearchHarness.actions.exploreDerelictShip(
    "profile-derelict",
    "boarding",
  );
} finally {
  Math.random = random;
}
assert.equal(
  fatalBaseSearchHarness.state().crew.length,
  0,
  "a scout at 1 HP must die from a later derelict injury",
);

const researchRiskHarness = createDiscoveryHarness({
  profile: "research",
  moduleType: "scanner",
  moduleHealth: 65,
});
Math.random = () => 0;
try {
  researchRiskHarness.actions.resolveDerelictDiscovery(
    "profile-derelict",
    "deepen",
  );
} finally {
  Math.random = random;
}
assert.equal(
  researchRiskHarness.state().ship.modules[0].health,
  0,
  "a research-vessel feedback surge must disable the scanner",
);

const researchFallbackRiskHarness = createDiscoveryHarness({
  profile: "research",
  moduleHealth: 65,
});
Math.random = () => 0;
try {
  researchFallbackRiskHarness.actions.resolveDerelictDiscovery(
    "profile-derelict",
    "deepen",
  );
} finally {
  Math.random = random;
}
assert.equal(
  researchFallbackRiskHarness.state().ship.modules[0].health,
  0,
  "a research-vessel feedback surge must disable another active module if no scanner remains",
);

assert.deepEqual(Object.keys(DERELICT_APPROACH_CONFIG), [
  "boarding",
  "engineering",
  "archive",
]);
assert.equal(DERELICT_APPROACH_CONFIG.boarding.scoutDamage, 5);
assert.equal(DERELICT_APPROACH_CONFIG.engineering.sparesMultiplier, 1.5);
assert.equal(DERELICT_APPROACH_CONFIG.archive.scannerDamage, 10);
assert.equal(DERELICT_RISK_CHANCE, 0.25);
const derelictSource = readFileSync(
  new URL("../src/game/slices/locations/helpers/exploreDerelictShip.ts", import.meta.url),
  "utf8",
);
assert.match(
  derelictSource,
  /const activeCrew = getLivingShipCrew\(crew\);[\s\S]*?activeCrew\.some\(\(member\) => member\.profession === "scout"\)/,
  "погибший разведчик не должен открывать исследование дрейфующего корабля",
);
assert.match(
  derelictSource,
  /approach === "engineering"[\s\S]*?!activeCrew\.some\(\(member\) => member\.profession === "engineer"\)/,
  "погибший инженер не должен открывать инженерный подход",
);
assert.ok(
  derelictSource.indexOf("const rareMineralsCargo") <
    derelictSource.indexOf("const electronicsCargo") &&
    derelictSource.indexOf("const electronicsCargo") <
      derelictSource.indexOf("const sparesCargo"),
  "при ограниченном трюме дрейфующий корабль должен сохранять редкие минералы раньше обычных деталей",
);

console.log("Derelict approach checks passed");
