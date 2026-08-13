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
