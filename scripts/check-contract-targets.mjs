import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  getContractTurnsRemaining,
  getGeneratedContractTimeLimit,
  isContractExpired,
} from "../src/game/contracts/contractDeadline.ts";

const require = createRequire(import.meta.url);
const scriptPath = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(scriptPath), "..");
const jiti = require("jiti")(scriptPath, {
  alias: { "@": path.join(root, "src") },
});
const { getGalaxyMapObjectives } = jiti(
  "../src/game/components/galaxyMapObjectives.ts",
);
const { getLocationName } = jiti("../src/lib/translationHelpers.ts");
const { formatContractDescription } = jiti(
  "../src/game/contracts/formatContractDescription.ts",
);
const { isContractTargetAvailable } = jiti(
  "../src/game/contracts/targetAvailability.ts",
);
const { RESEARCH_TREE } = jiti("../src/game/constants/research/index.ts");
const { checkContractExpiry } = jiti(
  "../src/game/slices/contracts/helpers/checkContractExpiry.ts",
);
const { revealExpeditionTile } = jiti(
  "../src/game/slices/locations/helpers/expedition/revealExpeditionTile.ts",
);
const { handleDerelictRecoveryContracts } = jiti(
  "../src/game/slices/contracts/helpers/handleDerelictRecoveryContracts.ts",
);
const { completeMiningContracts } = jiti(
  "../src/game/slices/artifacts/helpers/tryFindArtifact.ts",
);
const { generatePlanetContracts } = jiti(
  "../src/game/contracts/generatePlanetContracts.ts",
);
const { generatePlanet, generateStation } = jiti("../src/game/galaxy/generate.ts");
const { refreshVisitedPlanetContracts } = jiti(
  "../src/game/contracts/refreshPlanetContracts.ts",
);
const { processScanContracts } = jiti(
  "../src/game/slices/contracts/helpers/processScanContracts.ts",
);
const { changeReputation: calculateReputationChange } = jiti(
  "../src/game/reputation/utils.ts",
);
const { loadWithMigrations } = jiti("../src/game/saves/migrations.ts");
await import("./register-ts-loader.mjs");
const { completeBattleContracts } = await import(
  "../src/game/slices/combat/helpers/completeBattleContracts.ts"
);
const { createContractsSlice } = await import(
  "../src/game/slices/contracts/contractsSlice.ts"
);
const { useGameStore } = await import("../src/game/store.ts");

const legacySyntheticResearch = {
  type: "research",
  requiresTechResearch: true,
  acceptedAt: 5,
  timeLimit: 15,
};
assert.equal(
  getContractTurnsRemaining(legacySyntheticResearch, 20),
  null,
  "исследование технологии не должно иметь срока даже в старом сохранении",
);
assert.equal(
  isContractExpired(legacySyntheticResearch, 20),
  false,
  "исследование технологии из старого сохранения не должно проваливаться по сроку",
);

const syntheticSource = {
  id: 101,
  name: "Synthetic source",
  tier: 2,
  locations: [],
};
const syntheticTarget = {
  id: 102,
  name: "Synthetic target",
  tier: 2,
  locations: [],
};
const originalSyntheticRandom = Math.random;
Math.random = () => 0.1;
const syntheticQuest = generatePlanetContracts(
  "Ледяная",
  syntheticSource,
  "synthetic-planet",
  0,
  [syntheticSource, syntheticTarget],
  "synthetic",
).find((contract) => contract.requiresTechResearch);
Math.random = originalSyntheticRandom;
assert.ok(syntheticQuest, "синтетики должны предлагать анализ данных Древних");
assert.equal(
  syntheticQuest.timeLimit,
  undefined,
  "новый анализ данных Древних не должен получать срок",
);

// Неудачный тип задания не должен съедать единственный слот доски: в этой
// сцене research невозможен, но scan_planet и supply_run выполнимы.
const retrySource = {
  id: 201,
  name: "Retry source",
  tier: 1,
  locations: [
    {
      id: "retry-source-planet",
      type: "planet",
      name: "location_names.planet_01",
      planetType: "Ледяная",
    },
  ],
};
const retryTarget = {
  id: 202,
  name: "Retry target",
  tier: 1,
  locations: [
    {
      id: "retry-target-planet",
      type: "planet",
      name: "location_names.planet_02",
      planetType: "Лесная",
    },
  ],
};
const retryRandomValues = [0, 0.45, 0, 0, 0, 0];
const originalRetryRandom = Math.random;
Math.random = () => retryRandomValues.shift() ?? 0;
const retriedContracts = generatePlanetContracts(
  "Ледяная",
  retrySource,
  "retry-source-planet",
  0,
  [retrySource, retryTarget],
  undefined,
  undefined,
  { canOfferCombat: false, allowFrontier: false },
);
Math.random = originalRetryRandom;
assert.equal(
  retriedContracts.length,
  1,
  "невалидный случайный тип не должен оставлять планетную доску пустой",
);

const locationTranslations = {
  "location_names.station_01": "Meridian Foundry",
  "location_names.planet_01": "Asterion",
  "sector_map.station_prefix": "Station",
};
const translateLocation = (key) => locationTranslations[key] ?? key;
assert.equal(
  getLocationName("location_names.station_01", translateLocation),
  "Meridian Foundry",
  "new station name keys are translated",
);
assert.equal(
  getLocationName("location_names.planet_01", translateLocation),
  "Asterion",
  "new planet name keys are translated",
);
assert.equal(
  getLocationName("station_name.A", translateLocation),
  "Station A",
  "legacy station names stay readable",
);
assert.equal(
  generateStation(2, 3).name,
  "location_names.station_18",
  "station names use the deterministic localized catalog",
);
assert.equal(
  generatePlanet(2, 3, 1, false).name,
  "location_names.planet_18",
  "planet names use the deterministic localized catalog",
);

const sectors = [
  {
    id: 1,
    locations: [
      { id: "1-0", type: "enemy", threat: 2 },
      { id: "1-1", type: "enemy", threat: 5, defeated: true },
      { id: "1-2", type: "storm", stormIntensity: 2 },
      { id: "1-3", type: "derelict_ship", derelictExplored: false },
      { id: "1-ice-1", type: "planet", planetType: "Ледяная" },
      {
        id: "1-ice-2",
        type: "planet",
        planetType: "Ледяная",
        isEmpty: true,
      },
      { id: "1-anomaly-1", type: "anomaly" },
      {
        id: "1-expedition",
        type: "planet",
        planetType: "Океаническая",
      },
    ],
  },
  {
    id: 2,
    locations: [
      { id: "2-0", type: "enemy", threat: 1, defeated: true },
      { id: "2-1", type: "storm", stormIntensity: 1 },
      { id: "2-2", type: "derelict_ship", derelictExplored: true },
      { id: "2-anomaly-1", type: "anomaly" },
      {
        id: "2-expedition-done",
        type: "planet",
        planetType: "Лесная",
        expeditionCompleted: true,
      },
    ],
  },
];

const defaultContext = { artifacts: [], researchedTechs: [] };
const ok = (c, completed = [], context = defaultContext) =>
  isContractTargetAvailable(c, sectors, completed, context);

const deliveryTargetSectors = [
  {
    id: 9,
    locations: [
      { id: "delivery-live", type: "friendly_ship" },
      { id: "delivery-defeated", type: "friendly_ship", defeated: true },
    ],
  },
];
assert.ok(
  isContractTargetAvailable(
    { type: "delivery", targetLocationId: "delivery-live" },
    deliveryTargetSectors,
    [],
    defaultContext,
  ),
  "доставка к живому торговцу должна оставаться доступной",
);
assert.ok(
  !isContractTargetAvailable(
    { type: "delivery", targetLocationId: "delivery-defeated" },
    deliveryTargetSectors,
    [],
    defaultContext,
  ),
  "доставка к уничтоженному торговцу не должна приниматься",
);

const visitedPlanet = {
  id: "refresh-visited",
  type: "planet",
  name: "location_names.planet_01",
  planetType: "Ледяная",
  visited: true,
  contracts: [
    {
      id: "refresh-open",
      type: "delivery",
      targetLocationId: "refresh-target",
    },
    { id: "refresh-active", type: "delivery" },
    { id: "refresh-completed", type: "delivery" },
    { id: "refresh-stale", type: "combat", sectorId: 2 },
  ],
};
const untouchedPlanet = {
  id: "refresh-unvisited",
  type: "planet",
  name: "location_names.planet_02",
  planetType: "Ледяная",
  contracts: [{ id: "refresh-untouched", type: "delivery" }],
};
const refreshSectors = [
  {
    id: 1,
    name: "Alpha",
    tier: 1,
    locations: [visitedPlanet, untouchedPlanet],
  },
  {
    id: 2,
    name: "Beta",
    tier: 1,
    locations: [
      { id: "refresh-target", type: "planet", name: "location_names.planet_03", planetType: "Лесная" },
      { id: "refresh-defeated", type: "enemy", defeated: true },
    ],
  },
];
const savedRandom = Math.random;
Math.random = () => 0.2;
const refreshedSectors = refreshVisitedPlanetContracts({
  activeContracts: [{ id: "refresh-active", type: "delivery" }],
  artifacts: [],
  completedContractIds: ["refresh-completed"],
  completedLocations: [],
  galaxy: { sectors: refreshSectors },
  research: { researchedTechs: [] },
  runProfileId: null,
});
Math.random = savedRandom;
assert.ok(refreshedSectors, "visited planets must be refreshed");
const refreshedPlanet = refreshedSectors[0].locations[0];
const refreshedIds = refreshedPlanet.contracts.map((contract) => contract.id);
assert.ok(refreshedIds.includes("refresh-open"), "open offers are retained");
assert.ok(!refreshedIds.includes("refresh-active"), "active offers are removed");
assert.ok(!refreshedIds.includes("refresh-completed"), "completed offers are removed");
assert.ok(!refreshedIds.includes("refresh-stale"), "stale offers are removed");
assert.ok(
  refreshedIds.filter((id) => id.startsWith("c-refresh-visited-")).length >= 1 &&
    refreshedIds.filter((id) => id.startsWith("c-refresh-visited-")).length <= 2,
  `refresh adds one or two offers: ${refreshedIds.join(", ")}`,
);
assert.ok(refreshedPlanet.contracts.length <= 5, "refresh never exceeds five open offers");
assert.deepEqual(
  refreshedSectors[0].locations[1].contracts,
  untouchedPlanet.contracts,
  "unvisited planets are untouched",
);

// combat: живой враг есть в секторе 1, в секторе 2 все убиты
assert.ok(ok({ type: "combat", sectorId: 1 }), "combat: живой враг не найден");
assert.ok(!ok({ type: "combat", sectorId: 2 }), "combat: зачищенный сектор прошёл проверку");
assert.ok(!ok({ type: "combat", sectorId: 99 }), "combat: несуществующий сектор прошёл проверку");

// bounty: угроза живого врага должна дотягивать до цели
assert.ok(ok({ type: "bounty", targetSector: 1, targetThreat: 2 }), "bounty: цель не найдена");
assert.ok(!ok({ type: "bounty", targetSector: 1, targetThreat: 5 }), "bounty: убитый враг угрозы 5 засчитан");

// rescue: шторм нужной силы, не пройденный
assert.ok(ok({ type: "rescue", sectorId: 1, requiredStormIntensity: 2 }), "rescue: шторм не найден");
assert.ok(
  !ok({ type: "rescue", sectorId: 1, requiredStormIntensity: 2 }, ["1-2"]),
  "rescue: пройденный шторм засчитан",
);
assert.ok(!ok({ type: "rescue", sectorId: 2, requiredStormIntensity: 2 }), "rescue: слабый шторм засчитан");
assert.ok(
  ok({
    type: "rescue",
    sectorId: 1,
    targetLocationId: "1-2",
    requiredStormIntensity: 2,
  }),
  "rescue: конкретный шторм не найден",
);
assert.ok(
  !ok(
    {
      type: "rescue",
      sectorId: 1,
      targetLocationId: "1-2",
      requiredStormIntensity: 2,
    },
    ["1-2"],
  ),
  "rescue: пройденный конкретный шторм засчитан",
);

// scan_planet: нужно достаточно разных планет, включая пустые
assert.ok(
  ok({ type: "scan_planet", planetType: "Ледяная", requiresVisit: 2 }),
  "scan_planet: доступные планеты не найдены",
);
assert.ok(
  !ok({ type: "scan_planet", planetType: "Ледяная", requiresVisit: 3 }),
  "scan_planet: недостаток планет не замечен",
);
assert.ok(
  !ok({
    type: "scan_planet",
    planetType: "Ледяная",
    requiresVisit: 2,
    scannedPlanetIds: ["1-ice-1"],
  }),
  "scan_planet: повторный скан засчитан как новая цель",
);
const emptyPlanetScan = processScanContracts({
  currentLocation: {
    id: "empty-scan-target",
    type: "planet",
    planetType: "Ледяная",
    isEmpty: true,
  },
  activeContracts: [
    {
      id: "empty-scan-contract",
      type: "scan_planet",
      planetType: "Ледяная",
      requiresVisit: 1,
      visited: 0,
    },
  ],
  ship: {
    modules: [
      { type: "scanner", disabled: false, manualDisabled: false, health: 100 },
    ],
  },
});
assert.equal(
  emptyPlanetScan.contracts[0].visited,
  1,
  "scan_planet: пустая планета не засчитана",
);
const scanPersistenceSnapshots = [];
const scanPersistenceState = {
  activeContracts: [
    {
      id: "saved-empty-scan-contract",
      type: "scan_planet",
      planetType: "Ледяная",
      requiresVisit: 1,
      visited: 0,
    },
  ],
  currentLocation: {
    id: "saved-empty-scan-target",
    type: "planet",
    planetType: "Ледяная",
    isEmpty: true,
  },
  ship: {
    modules: [
      { type: "scanner", disabled: false, manualDisabled: false, health: 100 },
    ],
  },
  addLog: () => undefined,
  saveGame: () => {
    scanPersistenceSnapshots.push(
      scanPersistenceState.activeContracts[0].visited,
    );
  },
};
const setScanPersistenceState = (update) => {
  const next = typeof update === "function"
    ? update(scanPersistenceState)
    : update;
  if (next) Object.assign(scanPersistenceState, next);
};
Object.assign(
  scanPersistenceState,
  createContractsSlice(setScanPersistenceState, () => scanPersistenceState),
);
scanPersistenceState.processScanContracts();
assert.deepEqual(
  scanPersistenceSnapshots,
  [1],
  "scan progress must be saved after visiting the planet",
);

// expedition_survey: завершённую экспедицию нельзя выдать повторно
assert.ok(
  ok({ type: "expedition_survey", targetPlanetId: "1-expedition" }),
  "expedition_survey: доступная планета не найдена",
);
assert.ok(
  !ok({ type: "expedition_survey", targetPlanetId: "2-expedition-done" }),
  "expedition_survey: завершённая экспедиция засчитана",
);

// research и mining: остаётся хотя бы одна выполнимая цель
assert.ok(
  ok({ type: "research", requiresAnomalies: 2 }),
  "research: доступные аномалии не найдены",
);
assert.ok(
  !ok({ type: "research", requiresAnomalies: 3 }),
  "research: недостаток аномалий не замечен",
);
assert.ok(
  !ok({ type: "research", requiresAnomalies: 2 }, ["1-anomaly-1"]),
  "research: пройденная аномалия засчитана",
);
const tierThreeTech = Object.entries(RESEARCH_TREE).find(
  ([, technology]) => technology.tier === 3,
);
assert.ok(tierThreeTech, "research: в дереве нет технологий третьего тира");
const allTechIds = Object.keys(RESEARCH_TREE);
assert.ok(
  !ok(
    { type: "research", requiresTechResearch: true, requiredTechTier: 3 },
    [],
    { artifacts: [], researchedTechs: allTechIds },
  ),
  "synthetic research: завершённое дерево засчитано",
);
assert.ok(
  ok(
    { type: "research", requiresTechResearch: true, requiredTechTier: 3 },
    [],
    {
      artifacts: [],
      researchedTechs: allTechIds.filter((techId) => techId !== tierThreeTech[0]),
    },
  ),
  "synthetic research: оставшаяся технология не найдена",
);
assert.ok(
  ok(
    { type: "mining", requiredRarities: ["mythic"] },
    [],
    { artifacts: [{ discovered: false, rarity: "mythic" }], researchedTechs: [] },
  ),
  "mining: подходящий артефакт не найден",
);
assert.ok(
  !ok(
    { type: "mining", requiredRarities: ["mythic"] },
    [],
    { artifacts: [{ discovered: false, rarity: "rare" }], researchedTechs: [] },
  ),
  "mining: неподходящий артефакт засчитан",
);

const generationSectors = [
  {
    id: 1,
    name: "Source",
    tier: 3,
    locations: [
      {
        id: "source-planet",
        type: "planet",
        name: "Source",
        planetType: "Пустынная",
      },
    ],
  },
  {
    id: 2,
    name: "Targets",
    tier: 3,
    locations: [
      { id: "ice-1", type: "planet", planetType: "Ледяная", isEmpty: true },
      { id: "ice-2", type: "planet", planetType: "Ледяная", isEmpty: true },
      { id: "ice-3", type: "planet", planetType: "Ледяная", isEmpty: true },
      {
        id: "survey-ready",
        type: "planet",
        planetType: "Океаническая",
      },
      {
        id: "survey-done",
        type: "planet",
        planetType: "Лесная",
        expeditionCompleted: true,
      },
    ],
  },
];
let generatedScan = false;
let generatedSurvey = false;
const originalRandom = Math.random;
let randomSeed = 12345;
Math.random = () => {
  randomSeed = (randomSeed * 1664525 + 1013904223) >>> 0;
  return randomSeed / 2 ** 32;
};
try {
  for (let index = 0; index < 100; index += 1) {
    const contracts = generatePlanetContracts(
      "Пустынная",
      generationSectors[0],
      "source-planet",
      0,
      generationSectors,
    );
    for (const contract of contracts) {
      if (contract.type === "scan_planet") {
        generatedScan = true;
        assert.equal(
          contract.planetType,
          "Ледяная",
          "генератор выдал scan_planet без нужного числа целей",
        );
        assert.equal(contract.requiresVisit, 3, "scan_planet: неверное число целей");
      }
      if (contract.type === "expedition_survey") {
        generatedSurvey = true;
        assert.equal(
          contract.targetPlanetId,
          "survey-ready",
          "генератор выдал уже завершённую экспедицию",
        );
      }
    }
  }
} finally {
  Math.random = originalRandom;
}
assert.ok(generatedScan, "генератор не выдал scan_planet для проверки");
assert.ok(generatedSurvey, "генератор не выдал expedition_survey для проверки");

// derelict_recovery: нужен конкретный ещё не исследованный покинутый корабль
assert.ok(
  ok({ type: "derelict_recovery", targetLocationId: "1-3" }),
  "derelict_recovery: доступный дереликт не найден",
);
assert.ok(
  !ok({ type: "derelict_recovery", targetLocationId: "2-2" }),
  "derelict_recovery: исследованный дереликт засчитан",
);
assert.ok(
  !ok({ type: "derelict_recovery", targetLocationId: "missing" }),
  "derelict_recovery: отсутствующая цель засчитана",
);

// Доставка требует существующей точки назначения, а не только номера сектора.
assert.ok(
  !ok({ type: "delivery", targetSector: 2 }),
  "delivery без конкретной точки назначения не должен быть доступен",
);
// прочие типы не трогаем
assert.ok(ok({ type: "combat" }), "combat без сектора не должен фильтроваться");

assert.equal(
  getContractTurnsRemaining(
    { acceptedAt: 10, timeLimit: 6 },
    14,
  ),
  2,
  "срок контракта рассчитан неверно",
);
assert.equal(
  getContractTurnsRemaining(
    { acceptedAt: 10, timeLimit: 6 },
    16,
  ),
  0,
  "на последнем ходу срок должен достигать нуля",
);
assert.ok(
  isContractExpired({ acceptedAt: 10, timeLimit: 6 }, 16),
  "контракт должен исчезнуть, когда срок достиг нуля",
);
assert.equal(
  getContractTurnsRemaining(
    { acceptedAt: 10, timeLimit: 6 },
    18,
  ),
  0,
  "просроченный контракт должен остаться на нуле",
);
assert.equal(
  getContractTurnsRemaining({}, 12),
  null,
  "контракт без срока не должен получать дедлайн",
);

let expiryState = {
  turn: 16,
  activeContracts: [
    {
      id: "expired-standard",
      type: "delivery",
      desc: "contracts.desc_delivery",
      acceptedAt: 10,
      timeLimit: 6,
      sourceDominantRace: "human",
    },
    {
      id: "expired-race",
      type: "research",
      desc: "contracts.desc_research_synth",
      acceptedAt: 10,
      timeLimit: 6,
      requiredRace: "synthetic",
      isRaceQuest: true,
    },
    {
      id: "still-active",
      type: "delivery",
      desc: "contracts.desc_delivery",
      acceptedAt: 10,
      timeLimit: 7,
    },
  ],
  ship: {
    cargo: [
      { item: "fuel", quantity: 3, contractId: "expired-standard" },
      { item: "ore", quantity: 1 },
    ],
  },
  galaxy: {
    sectors: [
      {
        locations: [
          {
            contracts: [
              { id: "expired-standard" },
              { id: "expired-race" },
              { id: "still-active" },
            ],
          },
        ],
      },
    ],
  },
};
const reputationChanges = [];
const expiryGet = () => ({
  ...expiryState,
  addLog: () => undefined,
  changeReputation: (raceId, amount) => reputationChanges.push([raceId, amount]),
});
const expirySet = (updater) => {
  expiryState = { ...expiryState, ...updater(expiryState) };
};

checkContractExpiry(expirySet, expiryGet);
assert.deepEqual(
  expiryState.activeContracts.map((contract) => contract.id),
  ["still-active"],
  "просроченные контракты должны удаляться сразу при нуле ходов",
);
assert.deepEqual(
  expiryState.ship.cargo,
  [{ item: "ore", quantity: 1 }],
  "груз просроченной доставки должен покинуть трюм",
);
assert.deepEqual(
  expiryState.galaxy.sectors[0].locations[0].contracts.map((contract) => contract.id),
  ["still-active"],
  "просроченные предложения должны исчезнуть с планеты",
);
assert.deepEqual(
  reputationChanges,
  [
    ["human", -2],
    ["synthetic", -10],
  ],
  "штраф должен применяться к расе, выдавшей контракт",
);
assert.equal(
  getGeneratedContractTimeLimit("delivery", 1, 1),
  8,
  "срок ближней доставки разбалансирован",
);
assert.equal(
  getGeneratedContractTimeLimit("delivery", 1, 3),
  12,
  "срок дальней доставки не учитывает путь",
);
assert.equal(
  getGeneratedContractTimeLimit("bounty", 1, 10),
  12,
  "охота на пирата должна всегда давать 12 ходов после принятия",
);
assert.equal(
  getGeneratedContractTimeLimit("derelict_recovery", 1, 1),
  8,
  "срок контракта на дереликт разбалансирован",
);
assert.equal(
  getGeneratedContractTimeLimit("scan_planet", 1, 3),
  undefined,
  "свободный контракт не должен получить искусственный срок",
);
assert.equal(
  formatContractDescription(
    {
      type: "scan_planet",
      desc: "contracts.desc_scan",
      planetType: "Ледяная",
    },
    (key, params) =>
      key === "locations.planet_types.ice"
        ? "Ледяная"
        : `📡 Сканирование: ${params?.planetType}`,
  ),
  "📡 Сканирование: Ледяная",
  "описание контракта не передаёт параметры перевода",
);
assert.equal(
  formatContractDescription(
    {
      desc: "contracts.derelict_recovery_pending",
      targetSectorName: "Кассиопея-2",
    },
    (_key, params) => `Дереликт: ${params?.sector}`,
  ),
  "Дереликт: Кассиопея-2",
  "описание дереликта должно показывать целевой сектор",
);

let derelictState = {
  credits: 10,
  raceReputation: { human: 0, synthetic: 0 },
  completedContractIds: [],
  pendingContractCompletions: [],
  activeContracts: [
    {
      id: "derelict-target",
      type: "derelict_recovery",
      targetLocationId: "1-3",
      reward: 42,
      sourceDominantRace: "human",
    },
    {
      id: "derelict-other",
      type: "derelict_recovery",
      targetLocationId: "2-2",
      reward: 99,
    },
    {
      id: "derelict-same-target",
      type: "derelict_recovery",
      targetLocationId: "1-3",
      reward: 8,
      sourceDominantRace: "synthetic",
    },
  ],
};
const derelictReputationChanges = [];
const derelictGet = () => ({
  ...derelictState,
  showContractCompletion: (contract) => {
    derelictState = {
      ...derelictState,
      pendingContractCompletions: [
        ...derelictState.pendingContractCompletions,
        contract,
      ],
    };
  },
  addLog: () => undefined,
  changeReputation: (raceId, amount) => {
    derelictReputationChanges.push([raceId, amount]);
    derelictState = {
      ...derelictState,
      raceReputation: {
        ...derelictState.raceReputation,
        [raceId]: derelictState.raceReputation[raceId] + amount,
      },
    };
  },
});
const derelictSet = (updater) => {
  derelictState = { ...derelictState, ...updater(derelictState) };
};

handleDerelictRecoveryContracts("1-3", derelictSet, derelictGet);
assert.equal(derelictState.credits, 60, "derelict_recovery: награда не выдана");
assert.deepEqual(
  derelictState.completedContractIds,
  ["derelict-target", "derelict-same-target"],
  "derelict_recovery: ID выполненного контракта не сохранён",
);
assert.deepEqual(
  derelictState.activeContracts.map((contract) => contract.id),
  ["derelict-other"],
  "derelict_recovery: снят нецелевой контракт",
);
assert.deepEqual(
  derelictReputationChanges,
  [
    ["human", 2],
    ["synthetic", 2],
  ],
  "derelict_recovery: репутация заказчика не обновлена",
);
assert.deepEqual(
  derelictState.pendingContractCompletions.map((result) => result.contract.id),
  ["derelict-target", "derelict-same-target"],
  "derelict_recovery: выполненные контракты должны попасть в очередь результата",
);
handleDerelictRecoveryContracts("1-3", derelictSet, derelictGet);
assert.equal(
  derelictState.credits,
  60,
  "derelict_recovery: награда выдана повторно",
);

let miningState = {
  credits: 10,
  completedContractIds: [],
  activeContracts: [
    {
      id: "mining-wrong-rarity",
      type: "mining",
      isRaceQuest: true,
      requiredRarities: ["mythic"],
      reward: 100,
    },
    {
      id: "mining-match-a",
      type: "mining",
      isRaceQuest: true,
      requiredRarities: ["rare"],
      reward: 20,
    },
    {
      id: "mining-match-b",
      type: "mining",
      isRaceQuest: true,
      requiredRarities: ["rare"],
      reward: 30,
    },
  ],
};
const miningGet = () => ({
  ...miningState,
  showContractCompletion: () => undefined,
  addLog: () => undefined,
});
const miningSet = (updater) => {
  miningState = { ...miningState, ...updater(miningState) };
};

completeMiningContracts(miningSet, miningGet, { rarity: "rare" });
assert.equal(miningState.credits, 60, "mining: награды не суммированы");
assert.deepEqual(
  miningState.completedContractIds,
  ["mining-match-a", "mining-match-b"],
  "mining: подходящие контракты не завершены",
);
assert.deepEqual(
  miningState.activeContracts.map((contract) => contract.id),
  ["mining-wrong-rarity"],
  "mining: снят контракт с неподходящей редкостью",
);

const surveyGrid = (revealed = []) =>
  Array.from({ length: 25 }, (_, index) => ({
    type: index === 12 ? "market" : "incident",
    revealed: revealed.includes(index),
    x: index % 5,
    y: Math.floor(index / 5),
  }));
let surveyState = {
  activeExpedition: {
    planetId: "survey-target",
    grid: surveyGrid([7, 11]),
    apTotal: 4,
    apRemaining: 4,
    stepApCost: 1,
    revealedCount: 2,
    scansRemaining: 0,
    orbitalScanAvailable: false,
    activeRuinsEvent: null,
    ruinsOutcome: null,
    ruinsDepth: 0,
    pendingTileIndex: null,
    rewards: {
      credits: 0,
      tradeGoods: [],
      researchResources: [],
      artifactFound: null,
    },
    finished: false,
    crewIds: [],
  },
  activeContracts: [
    {
      id: "survey-target-contract",
      type: "expedition_survey",
      targetPlanetId: "survey-target",
      tilesRevealed: 2,
      requiredDiscoveries: 3,
      expeditionDone: false,
    },
    {
      id: "survey-other-contract",
      type: "expedition_survey",
      targetPlanetId: "other-planet",
      tilesRevealed: 0,
      requiredDiscoveries: 3,
      expeditionDone: false,
    },
  ],
  currentSector: { locations: [{ id: "survey-target", type: "planet" }] },
  crew: [],
};
let surveySaveCalls = 0;
const surveyGet = () => ({
  ...surveyState,
  addLog: () => undefined,
  tryFindArtifact: () => null,
  saveGame: () => {
    surveySaveCalls += 1;
  },
});
const surveySet = (updater) => {
  surveyState = { ...surveyState, ...updater(surveyState) };
};

revealExpeditionTile(12, surveySet, surveyGet);
assert.deepEqual(
  surveyState.activeContracts.map((contract) => [
    contract.id,
    contract.tilesRevealed,
    contract.expeditionDone,
  ]),
  [
    ["survey-target-contract", 3, true],
    ["survey-other-contract", 0, false],
  ],
  "любая открытая клетка должна засчитываться только в контракт целевой планеты",
);
assert.equal(
  surveySaveCalls,
  1,
  "открытие клетки экспедиции должно сохранять прогресс",
);

const migratedSurvey = loadWithMigrations(
  JSON.stringify({
    version: 6,
    state: {
      activeExpedition: {
        ...surveyState.activeExpedition,
        grid: surveyGrid([6, 7, 11, 12]),
        revealedCount: 2,
      },
      activeContracts: surveyState.activeContracts.map((contract) => ({
        ...contract,
        tilesRevealed: contract.id === "survey-target-contract" ? 2 : 0,
        expeditionDone: false,
      })),
    },
  }),
);
assert.ok(migratedSurvey, "сохранение с активной экспедицией не загрузилось");
assert.equal(
  migratedSurvey.activeExpedition?.revealedCount,
  4,
  "миграция должна восстановить число открытых клеток по сетке",
);
assert.deepEqual(
  migratedSurvey.activeContracts.map((contract) => [
    contract.id,
    contract.tilesRevealed,
    contract.expeditionDone,
  ]),
  [
    ["survey-target-contract", 4, true],
    ["survey-other-contract", 0, false],
  ],
  "миграция должна восстановить прогресс только целевого контракта",
);

const migratedContracts = loadWithMigrations(
  JSON.stringify({
    version: 7,
    state: {
      galaxy: { sectors },
      completedLocations: [],
      artifacts: [],
      research: { researchedTechs: [] },
      activeContracts: [
        {
          id: "migrated-scan-valid",
          type: "scan_planet",
          planetType: "Ледяная",
          requiresVisit: 2,
        },
        {
          id: "migrated-scan-impossible",
          type: "scan_planet",
          planetType: "Несуществующая",
          requiresVisit: 1,
        },
        {
          id: "migrated-survey-valid",
          type: "expedition_survey",
          targetPlanetId: "1-expedition",
        },
        {
          id: "migrated-survey-impossible",
          type: "expedition_survey",
          targetPlanetId: "2-expedition-done",
        },
      ],
    },
  }),
);
assert.ok(migratedContracts, "сохранение с недостижимыми контрактами не загрузилось");
assert.deepEqual(
  migratedContracts.activeContracts.map((contract) => contract.id),
  ["migrated-scan-valid", "migrated-survey-valid"],
  "миграция должна снять только недостижимые контракты",
);

// Старые сохранения могли содержать доставку к уже уничтоженному торговцу.
// При миграции снимаем такое задание вместе с привязанным грузом.
const migratedInvalidDelivery = loadWithMigrations(
  JSON.stringify({
    version: 29,
    state: {
      stateVersion: 29,
      galaxy: {
        sectors: [
          {
            id: 9,
            locations: [
              { id: "legacy-defeated-trader", type: "friendly_ship", defeated: true },
              { id: "legacy-live-trader", type: "friendly_ship" },
            ],
          },
        ],
      },
      completedLocations: [],
      artifacts: [],
      research: { researchedTechs: [] },
      ship: {
        cargo: [
          { item: "spares", quantity: 10, contractId: "legacy-invalid-delivery" },
          { item: "fuel", quantity: 10, contractId: "legacy-valid-delivery" },
          { item: "ore", quantity: 1 },
        ],
      },
      activeContracts: [
        {
          id: "legacy-invalid-delivery",
          type: "delivery",
          targetLocationId: "legacy-defeated-trader",
        },
        {
          id: "legacy-valid-delivery",
          type: "delivery",
          targetLocationId: "legacy-live-trader",
        },
      ],
      pendingContractDecision: { contractId: "legacy-invalid-delivery" },
    },
  }),
);
assert.ok(migratedInvalidDelivery, "сохранение с устаревшей доставкой не загрузилось");
assert.deepEqual(
  migratedInvalidDelivery.activeContracts.map((contract) => contract.id),
  ["legacy-valid-delivery"],
  "миграция должна снять доставку к уничтоженной цели",
);
assert.deepEqual(
  migratedInvalidDelivery.ship.cargo.map((cargo) => cargo.contractId ?? cargo.item),
  ["legacy-valid-delivery", "ore"],
  "миграция должна убрать только груз снятой доставки",
);
assert.equal(
  migratedInvalidDelivery.pendingContractDecision,
  null,
  "миграция должна закрыть решение по снятой доставке",
);

const mapObjectives = getGalaxyMapObjectives({
  sectors: [
    {
      id: 1,
      name: "Alpha",
      locations: [{ id: "alpha-anomaly", name: "Relay", type: "anomaly" }],
    },
    {
      id: 2,
      name: "Omega",
      locations: [
        {
          id: "omega-oracle",
          name: "Void Oracle",
          type: "boss",
          bossId: "void_oracle",
        },
      ],
    },
  ],
  activeContracts: [
    {
      type: "delivery",
      targetSector: 1,
      targetLocationName: "location_names.station_01",
    },
  ],
  artifacts: [
    {
      hinted: true,
      discovered: false,
      hintedAt: { sectorName: "Alpha", locationName: "Relay" },
    },
  ],
  completedLocations: [],
  bossesVisible: true,
  knownLocationIntel: {},
  navigatorTargets: [],
  translate: translateLocation,
});
assert.ok(
  mapObjectives.some(
    (objective) =>
      objective.kind === "contract" &&
      objective.sectorId === 1 &&
      objective.label === "Meridian Foundry",
  ),
  "контрактная цель на карте не локализована",
);
assert.ok(
  mapObjectives.some(
    (objective) => objective.kind === "artifact" && objective.sectorId === 1,
  ),
  "наводка на артефакт не отмечена на карте",
);
assert.ok(
  mapObjectives.some(
    (objective) => objective.kind === "final" && objective.sectorId === 2,
  ),
  "известный Оракул Пустоты не отмечен на карте",
);

let friendlyBountyState = {
  credits: 0,
  raceReputation: {
    human: 11,
    synthetic: 0,
    xenosymbiont: 0,
    krylorian: 0,
    voidborn: 0,
    crystalline: 0,
  },
  completedContractIds: [],
  activeContracts: [
    {
      id: "friendly-bounty",
      type: "bounty",
      reward: 50,
      targetSector: 7,
      targetThreat: 2,
      sourceDominantRace: "human",
      bountyTier: "friendly",
      reputationReward: 4,
    },
  ],
  currentSector: { id: 7, locations: [] },
};
const friendlyBountySet = (updater) => {
  friendlyBountyState = { ...friendlyBountyState, ...updater(friendlyBountyState) };
};
const friendlyBountyGet = () => ({
  ...friendlyBountyState,
  addLog: () => undefined,
  showContractCompletion: () => undefined,
  changeReputation: (raceId, amount) => {
    const result = calculateReputationChange(friendlyBountyState.raceReputation, raceId, amount);
    friendlyBountyState = {
      ...friendlyBountyState,
      raceReputation: {
        ...friendlyBountyState.raceReputation,
        [raceId]: result.newValue,
        ...Object.fromEntries(
          result.affectedRaces.map(({ raceId: affectedRaceId, change }) => [
            affectedRaceId,
            (friendlyBountyState.raceReputation[affectedRaceId] ?? 0) + change,
          ]),
        ),
      },
    };
  },
});

completeBattleContracts(friendlyBountySet, friendlyBountyGet, 2, false);
assert.equal(friendlyBountyState.raceReputation.human, 15, "friendly bounty must add +4 primary reputation");
assert.equal(friendlyBountyState.raceReputation.synthetic, -1, "friendly bounty must keep the existing reputation ripple");

// Кнопка показывается только у цели, но стор тоже обязан отвергать прямой
// вызов из другого места или без выданного контрактного груза.
useGameStore.setState({
  credits: 0,
  crew: [],
  completedContractIds: [],
  currentLocation: { id: "wrong-delivery-location", type: "planet" },
  ship: { cargo: [], tradeGoods: [] },
  activeContracts: [
    {
      id: "guarded-delivery",
      type: "delivery",
      desc: "contracts.name_delivery",
      reward: 777,
      cargo: "spares",
      quantity: 10,
      targetLocationId: "actual-delivery-target",
    },
  ],
});
useGameStore.getState().completeDeliveryContract("guarded-delivery");
const guardedDeliveryState = useGameStore.getState();
assert.equal(
  guardedDeliveryState.credits,
  0,
  "доставку нельзя сдать вне точки назначения",
);
assert.equal(
  guardedDeliveryState.activeContracts.length,
  1,
  "доставку без контрактного груза нельзя закрыть",
);
assert.ok(
  !guardedDeliveryState.completedContractIds.includes("guarded-delivery"),
  "несданная доставка не должна помечаться выполненной",
);

console.log("✅ check-contract-targets: валидация целей контрактов в порядке");
