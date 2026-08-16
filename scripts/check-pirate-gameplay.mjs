import "./register-ts-loader.mjs";
import assert from "node:assert/strict";

const { generatePirateContracts } = await import(
  "../src/game/slices/pirate/contracts.ts"
);
const {
  canFightWantedPursuit,
  getWantedBribeCost,
  isWantedCheckpointRequired,
} = await import("../src/game/slices/pirate/wanted.ts");
const { loadWithMigrations } = await import(
  "../src/game/saves/migrations.ts"
);
const { generateGalaxy } = await import("../src/game/galaxy/generateGalaxy.ts");
const { RUN_PROFILES } = await import("../src/game/galaxy/runProfiles.ts");
const { createPirateSlice } = await import(
  "../src/game/slices/pirate/createPirateSlice.ts"
);
const { completeBattleContracts } = await import(
  "../src/game/slices/combat/helpers/completeBattleContracts.ts"
);

const applyStateUpdate = (state, update) => {
  const patch = typeof update === "function" ? update(state) : update;
  if (patch && patch !== state) Object.assign(state, patch);
};

const pirateStation = {
  id: "pirate-station",
  stationId: "pirate-station",
  type: "station",
  name: "Пиратская база",
  stationConfig: { isPirate: true },
};
const targets = [
  pirateStation,
  {
    id: "trade-station",
    stationId: "trade-station",
    type: "station",
    name: "Торговый узел",
    stationConfig: { isPirate: false },
  },
  {
    id: "enemy-patrol",
    type: "enemy",
    name: "Патруль",
    enemyType: "raider",
    threat: 2,
  },
];

const originalRandom = Math.random;
try {
  for (const randomValue of [0.1, 0.5, 0.9]) {
    Math.random = () => randomValue;
    const contracts = generatePirateContracts(pirateStation, 2, targets);

    assert.ok(contracts.length >= 1, "пиратская база должна выдавать задания");
    for (const contract of contracts) {
      assert.equal(
        contract.timeLimit,
        16,
        "срок пиратского задания уровня 2 должен быть 16 ходов",
      );
      assert.ok(
        targets.some((location) => location.id === contract.targetLocationId),
        "пиратское задание обязано вести к существующей цели",
      );
      if (contract.type === "pirate_bounty") {
        assert.equal(
          contract.targetLocationId,
          "enemy-patrol",
          "заказ на голову должен указывать на живой вражеский корабль",
        );
      } else {
        assert.equal(
          contract.targetLocationId,
          "trade-station",
          "контрабанда и налёт должны вести на легальную станцию",
        );
      }
    }
  }
} finally {
  Math.random = originalRandom;
}

assert.equal(
  isWantedCheckpointRequired(49),
  false,
  "до 50 разыскиваемость не должна блокировать стыковку",
);
assert.equal(
  isWantedCheckpointRequired(50),
  true,
  "на 50 должна начаться проверка на легальной станции",
);
assert.equal(
  canFightWantedPursuit(74),
  false,
  "охотники не должны быть доступны ниже 75",
);
assert.equal(
  canFightWantedPursuit(75),
  true,
  "на 75 игрок может прорываться через охотников",
);
assert.equal(
  getWantedBribeCost(50),
  215,
  "взятка на пороге разыскиваемости должна стоить 215 кредитов",
);

const checkpointState = {
  currentLocation: {
    id: "legal-station",
    type: "station",
    stationConfig: { isPirate: false },
  },
  wantedHeat: 50,
  credits: 1_000,
  ship: { tradeGoods: [] },
  gameMode: "wanted_checkpoint",
  addLog: () => {},
};
const checkpointSlice = createPirateSlice(
  (update) => applyStateUpdate(checkpointState, update),
  () => checkpointState,
);
checkpointSlice.resolveWantedCheckpoint("bribe");
assert.equal(checkpointState.credits, 785, "bribe must deduct its real cost");
assert.equal(
  checkpointState.wantedHeat,
  45,
  "bribe must lower the global wanted heat to 45",
);
assert.equal(
  checkpointState.gameMode,
  "station",
  "successful bribe must allow docking",
);

const smugglingState = {
  currentLocation: { id: "target-station", type: "station" },
  activeContracts: [
    {
      id: "smuggling-job",
      type: "pirate_smuggling",
      targetLocationId: "target-station",
      sourcePlanetId: "pirate-station",
      quantity: 10,
      reward: 400,
      desc: "contracts.desc_pirate_smuggling",
    },
  ],
  ship: { tradeGoods: [{ item: "contraband", quantity: 10 }] },
  wantedHeat: 0,
  probes: 0,
  addLog: () => {},
};
const smugglingSlice = createPirateSlice(
  (update) => applyStateUpdate(smugglingState, update),
  () => smugglingState,
);
smugglingSlice.performPirateContractObjective("smuggling-job");
assert.equal(
  smugglingState.ship.tradeGoods.length,
  0,
  "smuggling drop must transfer contraband out of the hold",
);
assert.equal(
  smugglingState.activeContracts[0]?.pirateObjectiveComplete,
  true,
  "smuggling drop must mark the job ready for turn-in",
);
assert.equal(
  smugglingState.wantedHeat,
  8,
  "smuggling drop must add eight global wanted heat",
);

const bountyState = {
  currentLocation: { id: "enemy-patrol", type: "enemy" },
  currentSector: { id: 1 },
  activeContracts: [
    {
      id: "bounty-job",
      type: "pirate_bounty",
      targetLocationId: "enemy-patrol",
      reward: 600,
      desc: "contracts.desc_pirate_bounty",
    },
  ],
  addLog: () => {},
};
completeBattleContracts(
  (update) => applyStateUpdate(bountyState, update),
  () => bountyState,
  2,
  false,
);
assert.equal(
  bountyState.activeContracts[0]?.pirateObjectiveComplete,
  true,
  "defeating the exact bounty target must mark the pirate job ready for turn-in",
);

const huntersState = {
  currentLocation: { id: "legal-station", type: "station" },
  currentSector: { id: 1 },
  activeContracts: [
    {
      id: "unrelated-bounty",
      type: "pirate_bounty",
      targetLocationId: "legal-station",
      reward: 600,
      desc: "contracts.desc_pirate_bounty",
    },
  ],
  addLog: () => {},
};
completeBattleContracts(
  (update) => applyStateUpdate(huntersState, update),
  () => huntersState,
  2,
  false,
  true,
);
assert.equal(
  huntersState.activeContracts[0]?.pirateObjectiveComplete,
  undefined,
  "hunters from a wanted checkpoint must not advance any contract",
);

for (const profile of Object.values(RUN_PROFILES)) {
  for (let run = 0; run < 3; run += 1) {
    const sectors = generateGalaxy(profile);
    const locations = sectors.flatMap((sector) => sector.locations);
    for (const sector of sectors) {
      for (const station of sector.locations.filter(
        (location) => location.stationConfig?.isPirate,
      )) {
        for (const contract of station.pirateContracts ?? []) {
          const target = locations.find(
            (location) => location.id === contract.targetLocationId,
          );
          assert.ok(
            target,
            `${profile.id}: pirate jobs must not keep a fake target`,
          );
          assert.equal(
            contract.sourcePlanetId,
            station.id,
            `${profile.id}: pirate job must return to its issuing station`,
          );
          assert.equal(
            contract.timeLimit,
            12 + sector.tier * 2,
            `${profile.id}: pirate job deadline must match its issuer tier`,
          );
        }
      }
    }
  }
}

const migrated = loadWithMigrations(JSON.stringify({ version: 27, state: {} }));
assert.equal(
  migrated?.wantedHeat,
  0,
  "старое сохранение без глобальной разыскиваемости должно мигрировать в ноль",
);
const migratedLegacyHeat = loadWithMigrations(
  JSON.stringify({
    version: 27,
    state: {
      galaxy: {
        sectors: [
          { locations: [{ id: "old-pirate", pirateHeat: 34 }] },
        ],
      },
    },
  }),
);
assert.equal(
  migratedLegacyHeat?.wantedHeat,
  34,
  "старое локальное тепло пиратской станции должно пережить миграцию",
);

const migratedLegacyPirateJobs = loadWithMigrations(
  JSON.stringify({
    version: 27,
    state: {
      turn: 42,
      activeContracts: [
        { id: "old-pirate-bounty", type: "pirate_bounty" },
        { id: "ordinary-contract", type: "delivery" },
      ],
      galaxy: {
        sectors: [
          {
            id: "old-sector",
            locations: [
              {
                id: "old-pirate-station",
                type: "station",
                stationConfig: { isPirate: true },
                pirateContracts: [
                  { id: "old-pirate-heist", type: "pirate_heist" },
                ],
                pirateLastRefreshTurn: 42,
              },
            ],
          },
        ],
      },
    },
  }),
);
assert.deepEqual(
  migratedLegacyPirateJobs?.activeContracts?.map((contract) => contract.id),
  ["ordinary-contract"],
  "старые принятые пиратские задания должны быть сняты, а обычные — сохранены",
);
const migratedPirateStation = migratedLegacyPirateJobs?.galaxy?.sectors[0]
  ?.locations[0];
assert.deepEqual(
  migratedPirateStation?.pirateContracts,
  [],
  "доска v27 должна очиститься от фиктивных пиратских целей",
);
assert.equal(
  migratedPirateStation?.pirateLastRefreshTurn,
  32,
  "очищенная доска должна обновиться при следующем визите",
);

console.log("Pirate wanted gameplay checks passed");
