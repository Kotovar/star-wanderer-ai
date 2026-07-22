import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { isContractTargetAvailable } from "../src/game/contracts/targetAvailability.ts";
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
const { checkContractExpiry } = jiti(
  "../src/game/slices/contracts/helpers/checkContractExpiry.ts",
);
const { revealExpeditionTile } = jiti(
  "../src/game/slices/locations/helpers/expedition/revealExpeditionTile.ts",
);
const { loadWithMigrations } = jiti("../src/game/saves/migrations.ts");

const sectors = [
  {
    id: 1,
    locations: [
      { id: "1-0", type: "enemy", threat: 2 },
      { id: "1-1", type: "enemy", threat: 5, defeated: true },
      { id: "1-2", type: "storm", stormIntensity: 2 },
    ],
  },
  {
    id: 2,
    locations: [
      { id: "2-0", type: "enemy", threat: 1, defeated: true },
      { id: "2-1", type: "storm", stormIntensity: 1 },
    ],
  },
];

const ok = (c, completed = []) => isContractTargetAvailable(c, sectors, completed);

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
