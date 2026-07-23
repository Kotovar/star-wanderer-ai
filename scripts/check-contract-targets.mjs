import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  getContractTurnsRemaining,
  getGeneratedContractTimeLimit,
  isContractExpired,
} from "../src/game/contracts/contractDeadline.ts";
import { formatContractDescription } from "../src/game/contracts/formatContractDescription.ts";
import { getGalaxyMapObjectives } from "../src/game/components/galaxyMapObjectives.ts";

const require = createRequire(import.meta.url);
const scriptPath = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(scriptPath), "..");
const jiti = require("jiti")(scriptPath, {
  alias: { "@": path.join(root, "src") },
});
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
const { processScanContracts } = jiti(
  "../src/game/slices/contracts/helpers/processScanContracts.ts",
);
const { loadWithMigrations } = jiti("../src/game/saves/migrations.ts");

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

// прочие типы не трогаем
assert.ok(ok({ type: "delivery", targetSector: 2 }), "delivery не должен фильтроваться");
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
    { desc: "contracts.desc_scan", planetType: "Ледяная" },
    (_key, params) => `📡 Сканирование: ${params?.planetType}`,
  ),
  "📡 Сканирование: Ледяная",
  "описание контракта не передаёт параметры перевода",
);

let derelictState = {
  credits: 10,
  completedContractIds: [],
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
  addLog: () => undefined,
  changeReputation: (raceId, amount) =>
    derelictReputationChanges.push([raceId, amount]),
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
const miningGet = () => ({ ...miningState, addLog: () => undefined });
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
const surveyGet = () => ({
  ...surveyState,
  addLog: () => undefined,
  tryFindArtifact: () => null,
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
  activeContracts: [{ type: "delivery", targetSector: 1 }],
  artifacts: [
    {
      hinted: true,
      discovered: false,
      hintedAt: { sectorName: "Alpha", locationName: "Relay" },
    },
  ],
  completedLocations: [],
  bossesVisible: true,
});
assert.ok(
  mapObjectives.some(
    (objective) => objective.kind === "contract" && objective.sectorId === 1,
  ),
  "контрактная цель не отмечена на карте",
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

console.log("✅ check-contract-targets: валидация целей контрактов в порядке");
