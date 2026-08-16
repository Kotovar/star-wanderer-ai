import "./register-ts-loader.mjs";
import assert from "node:assert/strict";

import { readFileSync } from "node:fs";

const {
  generatePirateContracts,
  getPirateContractTimeLimit,
  PIRATE_CONTRACT_REFRESH_INTERVAL,
  refreshPirateContracts,
} = await import(
  "../src/game/slices/pirate/contracts.ts"
);
const {
  canFightWantedPursuit,
  getContrabandHeat,
  getHeatAfterCheckpoint,
  getWantedBribeCost,
  isWantedCheckpointRequired,
  TROPHY_PURCHASE_HEAT,
  WANTED_CHECKPOINT_HEAT,
  WANTED_HEAT_ON_BREAKOUT,
  WANTED_HEAT_ON_PURSUIT_ESCAPE,
  WANTED_PURSUIT_HEAT,
} = await import("../src/game/slices/pirate/wanted.ts");
const { getContrabandReputationPenalty } = await import(
  "../src/game/slices/trade/constants.ts"
);
const { restockStations } = await import("../src/game/stations/marketTick.ts");
const { initializeStationData } = await import(
  "../src/game/stations/initialize.ts"
);
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
  {
    id: "trader-ship",
    type: "friendly_ship",
    name: "Караван Мелис",
    dominantRace: "human",
  },
];

const originalRandom = Math.random;
try {
  for (const randomValue of [0.1, 0.5, 0.9]) {
    Math.random = () => randomValue;
    const contracts = generatePirateContracts(pirateStation, 2, targets);

    assert.ok(contracts.length >= 1, "пиратская база должна выдавать задания");
    assert.equal(
      new Set(contracts.map((c) => `${c.type}:${c.targetLocationId}`)).size,
      contracts.length,
      "доска не должна дважды предлагать одну и ту же пару «тип + цель»",
    );
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
        // Пираты заказывают торговцев, а не патрули: заказ на вражеский
        // корабль дублировал обычный bounty легальных досок и ставил игрока
        // на сторону закона за пиратские деньги
        assert.equal(
          contract.targetLocationId,
          "trader-ship",
          "заказ на голову должен указывать на мирного торговца",
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

const boardStation = {
  ...pirateStation,
  pirateContracts: [{ id: "old-offer", type: "pirate_heist" }],
  pirateLastRefreshTurn: 0,
};
const boardSectors = [
  {
    id: 1,
    tier: 2,
    locations: [boardStation, ...targets.filter(({ id }) => id !== boardStation.id)],
  },
];
assert.equal(
  PIRATE_CONTRACT_REFRESH_INTERVAL,
  50,
  "пиратская доска должна использовать общий интервал в 50 ходов",
);
assert.equal(
  refreshPirateContracts(boardStation, 2, 49, boardSectors),
  false,
  "пиратская доска не должна обновляться раньше 50 ходов",
);
assert.equal(
  boardStation.pirateContracts[0]?.id,
  "old-offer",
  "ранний вход на станцию не должен заменять предложения доски",
);
assert.equal(
  refreshPirateContracts(boardStation, 2, 50, boardSectors),
  true,
  "пиратская доска должна обновляться ровно на 50-м ходу",
);
assert.equal(
  boardStation.pirateLastRefreshTurn,
  50,
  "обновлённая доска должна запомнить текущий ход",
);

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
  30,
  "взятка должна снимать фиксированные 20 розыска, а не сбрасывать шкалу",
);
assert.equal(
  checkpointState.gameMode,
  "station",
  "successful bribe must allow docking",
);

// Досмотр не обнуляет розыск: раньше любой исход возвращал ровно 45, и одна
// тонна контрабанды превращала розыск 100 в 45 бесплатно
assert.equal(
  getHeatAfterCheckpoint(100),
  80,
  "досмотр на высоком розыске должен оставлять игрока разыскиваемым",
);
assert.ok(
  getHeatAfterCheckpoint(100, 30) < getHeatAfterCheckpoint(100, 1),
  "сброс полного трюма должен помогать сильнее, чем сброс одной тонны",
);

const dumpState = {
  currentLocation: {
    id: "legal-station",
    type: "station",
    stationConfig: { isPirate: false },
  },
  wantedHeat: 100,
  credits: 0,
  ship: {
    tradeGoods: [{ item: "contraband", quantity: 20 }],
    // Подрядный груз лежит в том же трюме — досмотр находит и его
    cargo: [{ item: "contraband", quantity: 10, contractId: "job" }],
  },
  gameMode: "wanted_checkpoint",
  addLog: () => {},
};
createPirateSlice(
  (update) => applyStateUpdate(dumpState, update),
  () => dumpState,
).resolveWantedCheckpoint("dump");
assert.equal(
  dumpState.ship.tradeGoods.length,
  0,
  "сброс должен выкидывать всю контрабанду",
);
assert.equal(
  dumpState.ship.cargo.length,
  0,
  "сброс обязан находить и подрядный груз: иначе задание переживало досмотр даром",
);
assert.equal(
  dumpState.wantedHeat,
  getHeatAfterCheckpoint(100, 30),
  "сброс должен снимать послабление досмотра плюс след самого груза",
);

// Отказ от досмотра: стрелять по страже можно на любом уровне розыска, но за
// это платят репутацией сразу — иначе отступление уводило бы от счёта
const breakoutState = {
  currentLocation: {
    id: "legal-station",
    type: "station",
    dominantRace: "human",
    stationConfig: { isPirate: false },
  },
  currentSector: { id: 1, tier: 2 },
  wantedHeat: WANTED_CHECKPOINT_HEAT,
  credits: 0,
  // Бой поднимается настоящий, через startDefenderCombat — фиктивной заглушки
  // мало: проверять надо именно то, что игра запускает на самом деле
  ship: { tradeGoods: [], cargo: [], shields: 0, maxShields: 20, modules: [] },
  discoveredEnemyCodexIds: [],
  crew: [],
  currentCombat: null,
  gameMode: "wanted_checkpoint",
  addLog: () => {},
  executeAmbushAttack: () => {},
  changeReputation: (race, amount) => {
    breakoutState.reputationHit = { race, amount };
  },
};
createPirateSlice(
  (update) => applyStateUpdate(breakoutState, update),
  () => breakoutState,
).resolveWantedCheckpoint("breakout");
assert.ok(
  breakoutState.currentCombat,
  "отказ от досмотра обязан начинать бой со стражей станции",
);
assert.equal(
  breakoutState.currentCombat.isAmbush,
  true,
  "стража стреляет первой: подчиниться отказались вы",
);
assert.equal(
  breakoutState.currentCombat.enemy.enemyType,
  "human_guard",
  "на перехват выходит стража расы станции, а не наёмники",
);
assert.equal(
  breakoutState.currentCombat.wantedPursuit,
  true,
  "бой обязан считаться делом розыска: иначе станцию пометит зачищенной",
);
assert.equal(
  breakoutState.currentCombat.checkpointBreakout,
  true,
  "прорыв обязан отличаться от погони: за него розыск растёт, а не падает",
);
assert.equal(
  breakoutState.currentCombat.defenderRace,
  undefined,
  "снятый defenderRace: за стрельбу по закону +60 репутации давать нельзя",
);
assert.ok(
  breakoutState.reputationHit,
  "платить репутацией надо сразу, до исхода боя: иначе отступление уводит от счёта",
);
assert.equal(
  breakoutState.reputationHit.race,
  "human",
  "счёт выставляет раса станции",
);
assert.ok(
  breakoutState.reputationHit.amount < 0,
  "репутация за стрельбу по страже обязана падать",
);
assert.ok(
  WANTED_HEAT_ON_BREAKOUT > 0,
  "победа над стражей обязана добавлять розыск, а не снимать его как победа над погоней",
);
// Разбор исхода живёт в playerVictory рядом с погоней — проверяем, что ветка
// прорыва там есть и разошлась с ней
const victorySource = readFileSync(
  new URL("../src/game/slices/combat/helpers/playerVictory.ts", import.meta.url),
  "utf8",
).replace(/^\s*\/\/.*$/gm, "");
assert.ok(
  /checkpointBreakout/.test(victorySource) &&
    /WANTED_HEAT_ON_BREAKOUT/.test(victorySource),
  "победа в прорыве обязана обрабатываться отдельно от победы над охотниками",
);

// Розыск и репутация за контрабанду считаются по тоннажу: раньше они были
// фиксированными за сделку, и 30т одной кнопкой стоили как одна тонна
assert.equal(getContrabandHeat(5), 4, "стандартная партия в 5т = 4 розыска");
assert.ok(
  getContrabandHeat(30) > getContrabandHeat(5),
  "оптовая партия обязана оставлять больший след",
);
assert.equal(
  getContrabandHeat(30),
  getContrabandHeat(15) * 2,
  "след контрабанды должен быть линеен по тоннажу",
);
assert.equal(
  getContrabandReputationPenalty(5),
  1,
  "стандартная партия в 5т = 1 репутации",
);
assert.ok(
  getContrabandReputationPenalty(30) > getContrabandReputationPenalty(5),
  "штраф репутации тоже обязан расти с тоннажем",
);
// «Нейтрально» держится до −10: одна закупка не должна уводить сразу в
// «недружелюбно», иначе первая же ходка к пиратам ссорит с расой навсегда
assert.ok(
  getContrabandReputationPenalty(30) < 10,
  "одна закупка не должна снимать целый уровень отношений",
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
  ship: {
    tradeGoods: [{ item: "contraband", quantity: 10 }],
    cargo: [{ item: "contraband", quantity: 10, contractId: "smuggling-job" }],
  },
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
  smugglingState.ship.cargo.length,
  0,
  "сдаётся подрядный груз из контрактного отсека",
);
assert.equal(
  smugglingState.ship.tradeGoods[0]?.quantity,
  10,
  "купленная игроком контрабанда к делу отношения не имеет и остаётся в трюме",
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
  // Шесть галактик на профиль, а не три: гарантия пиратской станции — про
  // редкий случай, и на трёх прогонах её потеря ловилась лишь через раз
  for (let run = 0; run < 6; run += 1) {
    const sectors = generateGalaxy(profile);
    const locations = sectors.flatMap((sector) => sector.locations);

    // Без пиратской станции забег остаётся без чёрного рынка, розыска и доски
    // целиком. «Сломанные торговые пути» с их нулевым весом станций теряли её
    // в половине галактик — при том что контрабанда там и должна цвести
    const pirateSectors = sectors.filter((sector) =>
      sector.locations.some((location) => location.stationConfig?.isPirate),
    );
    assert.ok(
      pirateSectors.length > 0,
      `${profile.id}: в галактике обязана быть хотя бы одна пиратская станция`,
    );
    for (const sector of pirateSectors) {
      assert.ok(
        sector.tier >= 2,
        `${profile.id}: пираты не селятся в тире 1`,
      );
    }

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
          const targetSector = sectors.find((candidate) =>
            candidate.locations.some(
              (location) => location.id === contract.targetLocationId,
            ),
          );
          assert.equal(
            contract.timeLimit,
            getPirateContractTimeLimit(sector.tier, targetSector.tier),
            `${profile.id}: срок задания должен учитывать и тир заказчика, и тир цели`,
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
  -8,
  "очищенная доска должна обновиться при следующем визите",
);

const migratedEmptyV28PirateBoard = loadWithMigrations(
  JSON.stringify({
    version: 28,
    state: {
      turn: 42,
      galaxy: {
        sectors: [
          {
            id: "old-sector",
            locations: [
              {
                id: "empty-pirate-station",
                type: "station",
                stationConfig: { isPirate: true },
                pirateContracts: [],
                pirateLastRefreshTurn: 32,
              },
              {
                id: "offered-pirate-station",
                type: "station",
                stationConfig: { isPirate: true },
                pirateContracts: [{ id: "real-offer", type: "pirate_heist" }],
                pirateLastRefreshTurn: 32,
              },
            ],
          },
        ],
      },
    },
  }),
);
assert.equal(
  migratedEmptyV28PirateBoard?.galaxy?.sectors[0]?.locations[0]
    ?.pirateLastRefreshTurn,
  -8,
  "пустая доска v28 должна обновиться при следующем визите по новому интервалу",
);
assert.equal(
  migratedEmptyV28PirateBoard?.galaxy?.sectors[0]?.locations[1]
    ?.pirateLastRefreshTurn,
  32,
  "миграция не должна сбрасывать реальные предложения существующей доски",
);

// ── Контрабанда живёт только на чёрном рынке ────────────────────────────────
// Раньше пополнение складов завозило её на легальные станции (к 10-му ходу
// 8 тонн на прилавке), а покупка не имела проверки isPirate, которая есть
// у продажи. Контрабанду можно было купить легально, без розыска, ещё и
// с плюсом к репутации за оптовую партию.
const contrabandSectors = [
  {
    id: 1,
    tier: 1,
    locations: [
      {
        id: "legal",
        stationId: "legal",
        type: "station",
        stationConfig: { isPirate: false },
      },
      {
        id: "black",
        stationId: "black",
        type: "station",
        stationConfig: { isPirate: true, priceDiscount: 0.75 },
      },
    ],
  },
];
const { stock: contrabandStock } = initializeStationData(contrabandSectors);

assert.equal(
  contrabandStock.legal.contraband,
  0,
  "легальная станция не должна держать контрабанду",
);
assert.ok(
  contrabandStock.black.contraband >= 30,
  "запас чёрного рынка обязан покрывать крупнейший заказ на контрабанду (30т)",
);
const isBlackMarket = (stationId, goodId) =>
  goodId !== "contraband" || stationId === "black";
let restocked = { legal: { ...contrabandStock.legal }, black: { ...contrabandStock.black } };
for (let tick = 0; tick < 20; tick += 1) {
  restocked = restockStations(restocked, 35, isBlackMarket);
}
assert.equal(
  restocked.legal.contraband,
  0,
  "пополнение складов не должно завозить контрабанду на легальную станцию",
);
assert.ok(
  restocked.legal.water >= 35,
  "остальные товары на легальной станции пополняться обязаны",
);
assert.ok(
  restocked.black.contraband >= 35,
  "чёрный рынок контрабандой пополняться обязан",
);

// Сам фильтр проверен выше на restockStations; здесь — что потурновый тик его
// действительно передаёт, а не пополняет всё подряд
const marketTickSource = readFileSync(
  new URL("../src/game/stations/processMarketTick.ts", import.meta.url),
  "utf8",
);
assert.ok(
  /isPirate/.test(marketTickSource) &&
    /goodId !== "contraband"/.test(marketTickSource),
  "потурновое пополнение обязано отсекать контрабанду на непиратских станциях",
);

const { buyTradeGood } = await import(
  "../src/game/slices/trade/helpers/buyTradeGood.ts"
);
const legalBuyState = {
  currentLocation: {
    id: "legal",
    stationId: "legal",
    type: "station",
    stationConfig: { isPirate: false },
  },
  stationPrices: { legal: { contraband: { buy: 100, sell: 60 } } },
  stationStock: { legal: { contraband: 40 } },
  credits: 100_000,
  ship: {
    tradeGoods: [],
    cargo: [],
    modules: [{ id: 1, type: "cargo", capacity: 100, health: 100, active: true }],
  },
  gases: {},
  probes: 0,
  crew: [],
  research: { researchedTechs: [], activeResearch: null },
  raceReputation: {},
  wantedHeat: 0,
  addLog: () => {},
};
const legalBuy = (goodId) =>
  buyTradeGood(
    (update) => applyStateUpdate(legalBuyState, update),
    () => legalBuyState,
    goodId,
    5,
  );
// Контрольная покупка: сцена рабочая, обычный товар покупается
legalBuyState.stationPrices.legal.water = { buy: 100, sell: 60 };
legalBuyState.stationStock.legal.water = 40;
legalBuy("water");
assert.equal(
  legalBuyState.ship.tradeGoods.length,
  1,
  "проверочная сцена должна позволять обычную покупку",
);
legalBuy("contraband");
assert.ok(
  !legalBuyState.ship.tradeGoods.some((good) => good.item === "contraband"),
  "контрабанду нельзя купить на легальной станции",
);

// Скидка пиратской станции не должна съедать надбавку чёрного рынка
const discountedSectors = [
  {
    id: 1,
    tier: 1,
    locations: [
      {
        id: "black",
        stationId: "black",
        type: "station",
        stationConfig: { isPirate: true, priceDiscount: 0.75 },
      },
    ],
  },
];
const { prices: discountedPrices } = initializeStationData(discountedSectors);
const { TRADE_GOODS } = await import("../src/game/constants/goods.ts");
assert.ok(
  discountedPrices.black.contraband.sell >=
    Math.floor(TRADE_GOODS.contraband.basePrice * 0.7),
  "цена контрабанды не должна резаться скидкой станции (иначе ×1.3 — фикция)",
);

// ── Сдача пиратского задания не отмывает розыск ─────────────────────────────
const turnInState = {
  currentLocation: {
    id: "pirate-station",
    type: "station",
    stationConfig: { isPirate: true },
  },
  activeContracts: [
    {
      id: "heist-job",
      type: "pirate_heist",
      sourcePlanetId: "pirate-station",
      pirateObjectiveComplete: true,
      reward: 800,
      desc: "contracts.desc_pirate_heist",
    },
  ],
  completedContractIds: [],
  credits: 0,
  crew: [],
  raceReputation: {},
  wantedHeat: 40,
  addLog: () => {},
  gainExp: () => undefined,
  showContractCompletion: () => {},
};
createPirateSlice(
  (update) => applyStateUpdate(turnInState, update),
  () => turnInState,
).completePirateContract("heist-job");
assert.equal(turnInState.credits, 800, "задание должно платить награду");
assert.equal(
  turnInState.wantedHeat,
  40,
  "сдача задания не должна снижать розыск: иначе контрабанда уходила в минус по розыску, а «Приют» терял смысл",
);

// ── Мораль от пиратского подряда ────────────────────────────────────────────
const lawfulTrait = { id: "trader", name: "Торговец", type: "positive", effect: {} };
const moraleState = {
  currentLocation: {
    id: "pirate-station",
    type: "station",
    stationConfig: { isPirate: true },
    pirateContracts: [
      {
        id: "morale-job",
        type: "pirate_heist",
        sourcePlanetId: "pirate-station",
        targetLocationId: "trade-station",
        reward: 800,
        desc: "contracts.desc_pirate_heist",
      },
    ],
  },
  galaxy: {
    sectors: [{ id: 1, locations: [{ id: "trade-station", type: "station" }] }],
  },
  activeContracts: [],
  completedContractIds: [],
  turn: 1,
  crew: [
    { id: 1, race: "human", health: 10, happiness: 100, traits: [lawfulTrait] },
    { id: 2, race: "human", health: 0, happiness: 100, traits: [lawfulTrait] },
    {
      id: 3,
      race: "human",
      health: 10,
      happiness: 100,
      outpostId: "outpost-1",
      traits: [lawfulTrait],
    },
    { id: 4, race: "synthetic", health: 10, happiness: 100, traits: [lawfulTrait] },
    { id: 5, race: "human", health: 10, happiness: 100, traits: [] },
    {
      id: 6,
      race: "human",
      health: 10,
      happiness: 100,
      hermit: true,
      traits: [lawfulTrait],
    },
  ],
  addLog: () => {},
};
createPirateSlice(
  (update) => applyStateUpdate(moraleState, update),
  () => moraleState,
).acceptPirateContract("morale-job");
const happinessById = Object.fromEntries(
  moraleState.crew.map((member) => [member.id, member.happiness]),
);
assert.equal(happinessById[1], 95, "принципиальный на борту обязан возмутиться");
assert.equal(happinessById[2], 100, "мёртвый о подряде не узнает");
assert.equal(
  happinessById[3],
  100,
  "приписанный к аванпосту за несколько секторов о подряде не узнает",
);
assert.equal(
  happinessById[4],
  100,
  "синтетик без настроения терять его не может (нужен shiftHappiness)",
);
assert.equal(happinessById[5], 100, "экипаж без принципов не возмущается");
assert.equal(happinessById[6], 100, "Отшельник настроение не теряет");

// ── Срок задания учитывает расстояние до цели ───────────────────────────────
assert.ok(
  getPirateContractTimeLimit(1, 4) > getPirateContractTimeLimit(1, 1),
  "заказ через всю галактику обязан давать больше ходов, чем заказ по соседству",
);
assert.equal(
  getPirateContractTimeLimit(2, 2),
  16,
  "срок задания уровня 2 по своему тиру должен остаться 16 ходов",
);

// ── Трофейный склад ─────────────────────────────────────────────────────────
// Единственная причина лететь к пиратам за железом: дёшево и штучно, но
// потрёпано и с чужими серийниками
const { generateStationItems } = await import(
  "../src/game/components/station/station-data.ts"
);
const { STATION_CONFIG } = await import("../src/game/galaxy/config.ts");
const { MODULE_HEALTH_BY_LEVEL } = await import(
  "../src/game/slices/shop/constants.ts"
);

const trophies = generateStationItems("pirate-yard", 2, STATION_CONFIG.pirate);
assert.ok(trophies.length > 0, "у пиратской станции должен быть трофейный склад");
assert.ok(
  trophies.every((item) => item.type !== "upgrade"),
  "пираты перепродают снятое, а не модернизируют — апгрейдов быть не должно",
);
assert.ok(
  trophies.some((item) => item.type === "module") &&
    trophies.some((item) => item.type === "weapon"),
  "склад должен держать и модули, и оружие",
);
for (const item of trophies) {
  assert.equal(item.stock, 1, `${item.id}: трофей штучный`);
  // Дешевле любой легальной скидки: 0.9 у верфи на модули, 0.85 на оружие
  assert.ok(
    item.price < Math.floor(item.basePrice * 0.85),
    `${item.id}: трофей обязан быть дешевле легальной скидки`,
  );
  if (item.type === "module") {
    const standard = MODULE_HEALTH_BY_LEVEL[item.level ?? 1] ?? 100;
    assert.ok(
      item.maxHealth < standard,
      `${item.id}: у трофея урезан запас прочности (${item.maxHealth} против ${standard})`,
    );
  }
}
assert.deepEqual(
  generateStationItems("pirate-yard", 2, STATION_CONFIG.pirate).map((i) => i.id),
  trophies.map((i) => i.id),
  "ассортимент склада обязан быть стабильным между заходами",
);
assert.ok(
  generateStationItems("legal-yard", 2, STATION_CONFIG.trade).some(
    (item) => item.type === "upgrade",
  ),
  "проверочная сцена: легальная станция апгрейды продавать не перестала",
);

const { createShopSlice } = await import(
  "../src/game/slices/shop/createShopSlice.ts"
);
const trophyModule = trophies.find((item) => item.type === "module");
const shopState = {
  currentLocation: {
    id: "pirate-station",
    stationId: "pirate-yard",
    type: "station",
    stationConfig: STATION_CONFIG.pirate,
  },
  credits: 100_000,
  wantedHeat: 0,
  ship: { gridSize: 5, modules: [], cargo: [], tradeGoods: [] },
  crew: [],
  research: { researchedTechs: [], activeResearch: null },
  stationInventory: {},
  addLog: () => {},
  canPlaceModule: () => true,
  updateShipStats: () => {},
};
createShopSlice(
  (update) => applyStateUpdate(shopState, update),
  () => shopState,
).buyItem(trophyModule);
assert.equal(
  shopState.ship.modules.length,
  1,
  "трофей должен вставать на корабль",
);
assert.equal(
  shopState.ship.modules[0].maxHealth,
  trophyModule.maxHealth,
  "изношенность трофея обязана дойти до установленного модуля",
);
assert.equal(
  shopState.wantedHeat,
  TROPHY_PURCHASE_HEAT,
  "покупка краденого железа обязана добавлять розыск",
);

// ── Груз на контрабанду выдаёт заказчик ─────────────────────────────────────
// Раньше 25т надо было купить самому, а на пиратской станции они стоят в разы
// больше награды: задание было убыточным по определению
const cargoJobLocation = {
  id: "pirate-station",
  type: "station",
  stationConfig: { isPirate: true },
  pirateContracts: [
    {
      id: "cargo-job",
      type: "pirate_smuggling",
      sourcePlanetId: "pirate-station",
      targetLocationId: "trade-station",
      quantity: 25,
      reward: 1000,
      desc: "contracts.desc_pirate_smuggling",
    },
  ],
};
const makeCargoState = (capacity) => ({
  currentLocation: cargoJobLocation,
  galaxy: {
    sectors: [{ id: 1, locations: [{ id: "trade-station", type: "station" }] }],
  },
  activeContracts: [],
  completedContractIds: [],
  crew: [],
  turn: 3,
  probes: 0,
  gases: {},
  research: { researchedTechs: [], activeResearch: null },
  ship: {
    tradeGoods: [],
    cargo: [],
    modules: [
      { id: 1, type: "cargo", capacity, health: 100, active: true },
    ],
  },
  addLog: () => {},
});

const cargoState = makeCargoState(100);
createPirateSlice(
  (update) => applyStateUpdate(cargoState, update),
  () => cargoState,
).acceptPirateContract("cargo-job");
assert.equal(
  cargoState.activeContracts.length,
  1,
  "задание должно приниматься",
);
const issued = cargoState.ship.cargo.find(
  (item) => item.contractId === "cargo-job",
);
assert.ok(issued, "заказчик обязан выдать груз вместе с заданием");
assert.equal(issued.item, "contraband");
assert.equal(issued.quantity, 25, "выдать надо ровно то, что просят доставить");
assert.equal(
  cargoState.ship.tradeGoods.length,
  0,
  "подрядный груз идёт в контрактный отсек, а не в продаваемый трюм",
);

const crampedState = makeCargoState(10);
createPirateSlice(
  (update) => applyStateUpdate(crampedState, update),
  () => crampedState,
).acceptPirateContract("cargo-job");
assert.equal(
  crampedState.activeContracts.length,
  0,
  "без места под груз задание брать нельзя — иначе оно невыполнимо с порога",
);

// ── Репутация с пиратами ────────────────────────────────────────────────────
// У чёрного рынка не было никакого отношения к игроку: доска, цены и трофеи
// не различали первый заказ и двадцатый
const {
  clampPirateStanding,
  getLaunderingCost,
  getPirateContractReward,
  getPirateRank,
  getTrophyPriceMultiplier,
  PIRATE_RANK_ASSOCIATE,
  PIRATE_RANK_INSIDER,
  PIRATE_STANDING_ON_EXPIRY,
  PIRATE_STANDING_PER_CONTRACT,
} = await import("../src/game/slices/pirate/standing.ts");

assert.equal(getPirateRank(0), "outsider");
assert.equal(getPirateRank(PIRATE_RANK_ASSOCIATE - 1), "outsider");
assert.equal(getPirateRank(PIRATE_RANK_ASSOCIATE), "associate");
assert.equal(getPirateRank(PIRATE_RANK_INSIDER), "insider");
assert.equal(clampPirateStanding(-40), 0);
assert.equal(clampPirateStanding(140), 100);
// Поля нет в сейвах до его появления: одного пропущенного `?? 0` хватило бы,
// чтобы NaN разошёлся по наградам, трофеям и отмывке
assert.equal(clampPirateStanding(undefined), 0);
assert.equal(clampPirateStanding(NaN), 0);
assert.equal(getLaunderingCost(undefined), getLaunderingCost(0));
assert.equal(getPirateContractReward(1000, undefined), 1000);
assert.ok(
  PIRATE_STANDING_ON_EXPIRY > PIRATE_STANDING_PER_CONTRACT,
  "доверие обязано теряться быстрее, чем набирается: иначе просрочка ничего не стоит",
);

// Каждая льгота обязана расти с репутацией и не разъезжаться на краях шкалы
assert.equal(
  getPirateContractReward(1000, 0),
  1000,
  "чужак получает ровно объявленную награду",
);
assert.equal(
  getPirateContractReward(1000, 100),
  1500,
  "подельнику платят в полтора раза больше",
);
assert.ok(
  getTrophyPriceMultiplier(100) < getTrophyPriceMultiplier(0),
  "трофеи своим обязаны быть дешевле",
);
assert.ok(
  getTrophyPriceMultiplier(0) < 0.85,
  "даже чужаку трофей дешевле любой легальной скидки",
);
assert.ok(
  getLaunderingCost(100) < getLaunderingCost(0),
  "отмывка своим обязана быть дешевле",
);
assert.ok(
  getLaunderingCost(100) > 0,
  "отмывка не должна становиться бесплатной",
);

// Скидка на трофеи обязана доходить до самого товара, а не жить в вакууме
assert.ok(
  generateStationItems("pirate-yard", 2, STATION_CONFIG.pirate, 100).every(
    (item, index) =>
      item.price <
      generateStationItems("pirate-yard", 2, STATION_CONFIG.pirate, 0)[index]
        .price,
  ),
  "репутация обязана снижать цену каждого трофея на складе",
);

// Сдача задания: репутация растёт, а платят уже по ней
const standingState = {
  currentLocation: {
    id: "pirate-station",
    type: "station",
    stationConfig: { isPirate: true },
  },
  activeContracts: [
    {
      id: "standing-job",
      type: "pirate_heist",
      sourcePlanetId: "pirate-station",
      pirateObjectiveComplete: true,
      reward: 1000,
      desc: "contracts.desc_pirate_heist",
    },
  ],
  completedContractIds: [],
  credits: 0,
  crew: [],
  raceReputation: {},
  wantedHeat: 0,
  pirateStanding: 100,
  addLog: () => {},
  gainExp: () => undefined,
  showContractCompletion: () => {},
};
createPirateSlice(
  (update) => applyStateUpdate(standingState, update),
  () => standingState,
).completePirateContract("standing-job");
assert.equal(
  standingState.credits,
  1500,
  "подельнику обязаны заплатить по репутации, а не по объявленной сумме",
);
assert.equal(
  standingState.pirateStanding,
  100,
  "репутация не должна переваливать за сотню",
);

// Задание собирается заново, а не берётся из standingState: там оно уже
// сдано и список активных пуст
const newcomerState = {
  ...standingState,
  credits: 0,
  pirateStanding: 0,
  completedContractIds: [],
  activeContracts: [
    {
      id: "newcomer-job",
      type: "pirate_heist",
      sourcePlanetId: "pirate-station",
      pirateObjectiveComplete: true,
      reward: 1000,
      desc: "contracts.desc_pirate_heist",
    },
  ],
};
createPirateSlice(
  (update) => applyStateUpdate(newcomerState, update),
  () => newcomerState,
).completePirateContract("newcomer-job");
assert.equal(newcomerState.credits, 1000, "чужаку платят по объявленной сумме");
assert.equal(
  newcomerState.pirateStanding,
  PIRATE_STANDING_PER_CONTRACT,
  "сдача задания обязана поднимать репутацию",
);

// Просрочка обязана бить по репутации, а не только по розыску
const { checkContractExpiry } = await import(
  "../src/game/slices/contracts/helpers/checkContractExpiry.ts"
);
const expiryState = {
  turn: 100,
  activeContracts: [
    {
      id: "late-job",
      type: "pirate_smuggling",
      acceptedAt: 1,
      timeLimit: 10,
      desc: "contracts.desc_pirate_smuggling",
    },
  ],
  wantedHeat: 0,
  pirateStanding: 50,
  galaxy: { sectors: [] },
  currentSector: null,
  currentLocation: null,
  ship: { cargo: [] },
  addLog: () => {},
  changeReputation: () => {},
};
checkContractExpiry(
  (update) => applyStateUpdate(expiryState, update),
  () => expiryState,
);
assert.equal(
  expiryState.activeContracts.length,
  0,
  "просроченное задание должно сниматься",
);
assert.equal(
  expiryState.pirateStanding,
  50 - PIRATE_STANDING_ON_EXPIRY,
  "просрочка обязана стоить репутации у заказчика",
);

// ── Развилка: подряд на зачистку базы ───────────────────────────────────────
// До неё пиратство ничего не закрывало — контрабанду можно было возить с
// идеальной репутацией у всех рас, потому что противопоставить ей было нечего
const {
  assaultPirateBase,
  hasActivePiratePurge,
  isPirateBaseAlive,
  PIRATE_PURGE_HEAT_RELIEF,
  PIRATE_PURGE_STANDING_LIMIT,
  resolvePirateBaseAssault,
} = await import("../src/game/slices/pirate/purge.ts");

assert.equal(
  PIRATE_PURGE_STANDING_LIMIT,
  PIRATE_RANK_ASSOCIATE,
  "порог отказа обязан совпадать с рангом «свой»: с него начинаются льготы пиратов",
);
assert.equal(
  isPirateBaseAlive({ stationConfig: { isPirate: true } }),
  true,
);
assert.equal(
  isPirateBaseAlive({ stationConfig: { isPirate: true }, pirateBaseDestroyed: true }),
  false,
  "снесённая база больше не считается живой целью",
);
assert.equal(
  hasActivePiratePurge([{ type: "pirate_smuggling" }]),
  false,
);
assert.equal(hasActivePiratePurge([{ type: "pirate_purge" }]), true);

// Подряд не дадут тому, кого пираты считают своим
const { acceptContract } = await import(
  "../src/game/slices/contracts/helpers/acceptContract.ts"
);
const purgeOffer = {
  id: "purge-base",
  type: "pirate_purge",
  desc: "contracts.desc_pirate_purge",
  reward: 1300,
  reputationReward: 12,
  sourceDominantRace: "human",
  targetLocationId: "pirate-base",
  targetThreat: 3,
};
const purgeBaseLocation = {
  id: "pirate-base",
  stationId: "pirate-base",
  type: "station",
  stationConfig: { isPirate: true },
};
const makeAcceptState = (standing) => ({
  activeContracts: [],
  completedContractIds: [],
  completedLocations: [],
  galaxy: { sectors: [{ id: 1, tier: 2, locations: [purgeBaseLocation] }] },
  artifacts: [],
  research: { researchedTechs: [], unlockedRecipes: [] },
  activeCrisis: null,
  raceReputation: {},
  pirateStanding: standing,
  ship: { modules: [], cargo: [], tradeGoods: [] },
  gases: {},
  probes: 0,
  turn: 5,
  addLog: () => {},
});
const friendlyState = makeAcceptState(PIRATE_PURGE_STANDING_LIMIT);
assert.equal(
  acceptContract(
    purgeOffer,
    (update) => applyStateUpdate(friendlyState, update),
    () => friendlyState,
  ),
  false,
  "своему у пиратов подряд на них выдавать нельзя — иначе развилки нет",
);
const neutralState = makeAcceptState(PIRATE_PURGE_STANDING_LIMIT - 1);
assert.equal(
  acceptContract(
    purgeOffer,
    (update) => applyStateUpdate(neutralState, update),
    () => neutralState,
  ),
  true,
  "нейтральному подряд обязан быть доступен",
);

// Взятый подряд закрывает пиратскую доску
const boycottState = {
  currentLocation: {
    id: "pirate-base",
    type: "station",
    stationConfig: { isPirate: true },
    pirateContracts: [
      {
        id: "job-while-purging",
        type: "pirate_heist",
        sourcePlanetId: "pirate-base",
        targetLocationId: "trade-station",
        reward: 800,
        desc: "contracts.desc_pirate_heist",
      },
    ],
  },
  galaxy: {
    sectors: [{ id: 1, locations: [{ id: "trade-station", type: "station" }] }],
  },
  activeContracts: [{ id: "purge-base", type: "pirate_purge" }],
  completedContractIds: [],
  crew: [],
  turn: 5,
  addLog: () => {},
};
createPirateSlice(
  (update) => applyStateUpdate(boycottState, update),
  () => boycottState,
).acceptPirateContract("job-while-purging");
assert.equal(
  boycottState.activeContracts.length,
  1,
  "нельзя работать на доске тех, кого подрядился уничтожить",
);

// Штурм и его итог
const assaultState = {
  currentLocation: { ...purgeBaseLocation },
  currentSector: { id: 1, tier: 2, locations: [{ ...purgeBaseLocation }] },
  galaxy: { sectors: [{ id: 1, tier: 2, locations: [{ ...purgeBaseLocation }] }] },
  activeContracts: [{ ...purgeOffer }],
  completedContractIds: [],
  credits: 0,
  wantedHeat: 100,
  pirateStanding: 20,
  turn: 7,
  addLog: () => {},
  changeReputation: (race, amount) => {
    assaultState.reputationGain = { race, amount };
  },
  startCombat: (enemy) => {
    assaultState.startedCombat = enemy;
  },
};
const assaultSet = (update) => applyStateUpdate(assaultState, update);
assaultPirateBase(assaultSet, () => assaultState);
assert.equal(
  assaultState.assaultingPirateBaseId,
  "pirate-base",
  "штурм обязан помечать, где он начался: победить можно и в другом бою",
);
assert.equal(
  assaultState.startedCombat.threat,
  purgeOffer.targetThreat,
  "оборона базы должна драться по угрозе из подряда",
);

resolvePirateBaseAssault(assaultSet, () => assaultState);
assert.equal(
  assaultState.currentLocation.pirateBaseDestroyed,
  true,
  "взятая база обязана исчезнуть вместе с рынком, складом и доской",
);
assert.deepEqual(
  assaultState.currentLocation.pirateContracts,
  [],
  "доска снесённой базы должна опустеть",
);
assert.equal(assaultState.credits, purgeOffer.reward, "подряд обязан заплатить");
assert.equal(
  assaultState.pirateStanding,
  0,
  "сдавшего базу пираты своим больше не считают",
);
assert.equal(
  assaultState.wantedHeat,
  100 - PIRATE_PURGE_HEAT_RELIEF,
  "доказанная лояльность обязана снимать розыск",
);
assert.equal(
  assaultState.reputationGain.race,
  "human",
  "репутация должна расти у расы заказчика",
);
assert.deepEqual(
  assaultState.activeContracts,
  [],
  "подряд закрывается на месте, возвращаться не к кому",
);
assert.equal(
  assaultState.assaultingPirateBaseId,
  null,
  "пометка штурма не должна тянуться за игроком",
);

// Чужая победа не должна засчитываться за взятую базу
const strayState = {
  currentLocation: { id: "some-enemy", type: "enemy" },
  currentSector: { id: 1, locations: [] },
  galaxy: { sectors: [] },
  assaultingPirateBaseId: "pirate-base",
  activeContracts: [{ ...purgeOffer }],
  completedContractIds: [],
  credits: 0,
  wantedHeat: 50,
  pirateStanding: 20,
  addLog: () => {},
  changeReputation: () => assert.fail("чужой бой не должен закрывать подряд"),
};
resolvePirateBaseAssault(
  (update) => applyStateUpdate(strayState, update),
  () => strayState,
);
assert.equal(strayState.credits, 0, "победа не на месте не оплачивается");
assert.equal(
  strayState.assaultingPirateBaseId,
  null,
  "но пометка обязана сняться, иначе засчитается следующая победа",
);

// Развилка обязана существовать в каждом забеге: подряд на каждую базу,
// заказчик — в другом секторе
for (const profile of Object.values(RUN_PROFILES)) {
  const sectors = generateGalaxy(profile);
  const bases = sectors.flatMap((sector) =>
    sector.locations.filter((location) => location.stationConfig?.isPirate),
  );
  const purges = sectors.flatMap((sector) =>
    sector.locations.flatMap((location) =>
      (location.contracts ?? [])
        .filter((contract) => contract.type === "pirate_purge")
        .map((contract) => ({ sector, contract })),
    ),
  );
  assert.equal(
    purges.length,
    bases.length,
    `${profile.id}: на каждую пиратскую базу обязан быть подряд на зачистку`,
  );
  for (const { sector, contract } of purges) {
    const targetSector = sectors.find((candidate) =>
      candidate.locations.some(
        (location) => location.id === contract.targetLocationId,
      ),
    );
    assert.ok(targetSector, `${profile.id}: подряд не должен вести в пустоту`);
    assert.notEqual(
      targetSector.id,
      sector.id,
      `${profile.id}: заказчик не должен сидеть в одном секторе с базой`,
    );
  }
}

// ── Перехват в пути ─────────────────────────────────────────────────────────
// До правки розыск влиял ровно на одно: стыковку на легальной станции. Сидеть
// на 90 можно было бесконечно, просто обходя легальные станции стороной.
const { getWantedInterceptionChance, rollWantedInterception } = await import(
  "../src/game/slices/pirate/interception.ts"
);

assert.equal(
  getWantedInterceptionChance(WANTED_PURSUIT_HEAT - 1),
  0,
  "ниже порога погони охотники выходить не должны",
);
assert.ok(
  getWantedInterceptionChance(WANTED_PURSUIT_HEAT) > 0,
  "на пороге погони перехват обязан стать возможным",
);
assert.ok(
  getWantedInterceptionChance(100) > getWantedInterceptionChance(80),
  "шанс перехвата обязан расти с розыском",
);
assert.ok(
  getWantedInterceptionChance(100) < 1,
  "перехват не должен быть гарантированным даже на сотне",
);

const interceptState = {
  wantedHeat: 100,
  turn: 12,
  currentSector: { id: 1, tier: 2 },
  currentCombat: null,
  traveling: null,
  addLog: () => {},
  startCombat: (enemy, isAmbush) => {
    interceptState.currentCombat = { enemy, isAmbush };
  },
};
const interceptSet = (update) => applyStateUpdate(interceptState, update);
assert.equal(
  rollWantedInterception(interceptSet, () => interceptState, () => 0.99),
  false,
  "неудачный бросок не должен начинать бой",
);
assert.equal(
  rollWantedInterception(interceptSet, () => interceptState, () => 0),
  true,
  "удачный бросок обязан начать бой",
);
assert.equal(
  interceptState.currentCombat.isAmbush,
  true,
  "перехват — засада: охотники ждали, а не встретились случайно",
);
assert.equal(
  interceptState.currentCombat.wantedPursuit,
  true,
  "бой обязан быть помечен как погоня, иначе playerVictory зачистит локацию и засчитает контракты",
);

const calmState = {
  wantedHeat: WANTED_PURSUIT_HEAT - 1,
  turn: 12,
  currentSector: { id: 1, tier: 2 },
  currentCombat: null,
  traveling: null,
  addLog: () => {},
  startCombat: () => assert.fail("перехвата ниже порога быть не должно"),
};
assert.equal(
  rollWantedInterception((u) => applyStateUpdate(calmState, u), () => calmState, () => 0),
  false,
  "ниже порога погони перехвата быть не должно даже при худшем броске",
);

// Перехват обязан висеть на всех путях прибытия в сектор — как радиация
// нейтронной звезды рядом с ним
for (const file of [
  "../src/game/slices/travel/helpers/processTravel.ts",
  "../src/game/slices/travel/helpers/selectSector.ts",
]) {
  // Комментарии срезаются: закомментированный вызов — это тоже потерянный
  // путь прибытия, а регулярка его от живого не отличит
  const source = readFileSync(new URL(file, import.meta.url), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
  // Считаются именно вызовы: в импортах и в объявлении за именем скобки нет
  const arrivals = (source.match(/applyNeutronRadiation\(/g) ?? []).length;
  const intercepts = (source.match(/rollWantedInterception\(/g) ?? []).length;
  assert.ok(arrivals > 0, `${file}: сцена проверки развалилась`);
  assert.equal(
    intercepts,
    arrivals,
    `${file}: перехват должен стоять на каждом пути прибытия в сектор`,
  );
}

// ── Побег от охотников не бесплатен ─────────────────────────────────────────
const combatSliceSource = readFileSync(
  new URL("../src/game/slices/combat/combatSlice.ts", import.meta.url),
  "utf8",
);
assert.ok(
  combatSliceSource.includes("WANTED_HEAT_ON_PURSUIT_ESCAPE"),
  "успешный побег из погони обязан добавлять розыск, иначе прорыв можно пробовать бесконечно",
);
assert.ok(
  WANTED_HEAT_ON_PURSUIT_ESCAPE > 0,
  "штраф за побег от охотников должен быть положительным",
);

console.log("Pirate wanted gameplay checks passed");
