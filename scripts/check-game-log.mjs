import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { setUiState } from "./register-ui-loader.mjs";

const { GameLog, getJournalCategory } = await import(
  "../src/game/components/GameLog.tsx"
);
const {
  getLoadedTranslationCatalogs,
  store: i18nStore,
} = await import("../src/lib/useTranslation.ts");
const { getLogMessage } = await import(
  "../src/game/slices/logs/utils.ts"
);

i18nStore.changeLanguage("en");
for (let attempt = 0; attempt < 10; attempt += 1) {
  if (i18nStore.t("journal.title") === "SHIP JOURNAL") break;
  await new Promise((resolve) => setTimeout(resolve, 0));
}
assert.equal(
  i18nStore.t("journal.title"),
  "SHIP JOURNAL",
  "проверка должна выполнять действия на английском каталоге",
);

assert.equal(
  typeof getJournalCategory,
  "function",
  "журнал должен экспортировать категоризатор для проверки правил фильтрации",
);

assert.equal(
  getJournalCategory({
    message: "Humans: +2",
    type: "info",
    turn: 12,
    category: "reputation",
  }),
  "reputation",
  "явно заданный риппл репутации должен быть виден в фильтре репутации",
);

assert.equal(
  getJournalCategory({
    message: "📡 Scan: Desert scanned",
    type: "info",
    turn: 12,
    category: "contracts",
  }),
  "contracts",
  "прогресс скан-контракта должен быть виден в фильтре заданий",
);

assert.equal(
  getJournalCategory({
    message: "Neutral event",
    type: "combat",
    turn: 12,
  }),
  "combat",
  "боевой тип остаётся совместимым с прежней категоризацией",
);

setUiState({
  turn: 12,
  log: [
    {
      message: "🦠 Quarantine lifted: the crew is recovering",
      type: "info",
      turn: 12,
      category: "system",
    },
  ],
});
i18nStore.changeLanguage("ru");
const legacyJournal = renderToStaticMarkup(createElement(GameLog));
assert.match(
  legacyJournal,
  /Карантин снят: экипаж приходит в себя/,
  "сохранённая английская запись должна переключаться на текущую локаль",
);
i18nStore.changeLanguage("en");

const { loadWithMigrations } = await import(
  "../src/game/saves/migrations.ts"
);
const migratedLogSave = loadWithMigrations(
  JSON.stringify({
    version: 30,
    state: {
      log: [
        {
          message: "🦠 Карантин снят: экипаж приходит в себя",
          type: "info",
          turn: 12,
          category: "system",
        },
      ],
    },
  }),
);
assert.equal(
  migratedLogSave?.log[0]?.messageKey,
  "game_logs.crisis_epidemic_ended",
  "миграция должна сохранить ключ распознанной старой записи",
);

const migratedParameterizedLogSave = loadWithMigrations(
  JSON.stringify({
    version: 30,
    state: {
      log: [
        {
          message: "🔬 Закуплены исследовательские материалы: 3× → −150₢",
          type: "info",
          turn: 12,
          category: "research",
        },
      ],
    },
  }),
);
assert.deepEqual(
  migratedParameterizedLogSave?.log[0]?.messageParams,
  { qty: "3", cost: "150" },
  "миграция должна восстановить значения плейсхолдеров",
);
assert.equal(
  getLogMessage(
    migratedParameterizedLogSave?.log[0],
    i18nStore.t,
    getLoadedTranslationCatalogs(),
  ),
  "🔬 Purchased research materials: 3× → −150₢",
  "восстановленные параметры должны подставляться в новую локаль",
);

const { createLogSlice } = await import(
  "../src/game/slices/logs/logSlice.ts"
);
const persistedLogState = { turn: 12, log: [] };
const persistedLogSlice = createLogSlice((updater) => updater(persistedLogState));
persistedLogSlice.addLog(
  "🦠 Quarantine lifted: the crew is recovering",
  "info",
  "system",
);
assert.equal(
  persistedLogState.log[0]?.messageKey,
  "game_logs.crisis_epidemic_ended",
  "новая запись должна сохранять ключ вместо одной отрендеренной строки",
);
i18nStore.changeLanguage("ru");
assert.equal(
  getLogMessage(
    persistedLogState.log[0],
    i18nStore.t,
    getLoadedTranslationCatalogs(),
  ),
  "🦠 Карантин снят: экипаж приходит в себя",
  "сохранённая новая запись должна перерисовываться на текущем языке",
);
i18nStore.changeLanguage("en");

const { createContractsSlice } = await import(
  "../src/game/slices/contracts/contractsSlice.ts"
);
const contractLogs = [];
const scanState = {
  currentLocation: {
    id: "desert-target",
    type: "planet",
    planetType: "Пустынная",
  },
  activeContracts: [
    {
      id: "scan-desert",
      type: "scan_planet",
      desc: "contracts.desc_scan",
      reward: 100,
      planetType: "Пустынная",
      requiresVisit: 1,
      sourcePlanetName: "Станция A",
      sourceSectorName: "sector_names.sector_1",
    },
  ],
  ship: { modules: [{ type: "scanner", health: 100 }] },
  addLog: (message, type, category) =>
    contractLogs.push({ message, type, category }),
  saveGame: () => {},
};
const setScanState = (updater) => Object.assign(scanState, updater(scanState));
Object.assign(
  scanState,
  createContractsSlice(setScanState, () => scanState),
);

scanState.processScanContracts();

assert.equal(
  contractLogs.at(-1)?.category,
  "contracts",
  "прогресс скан-контракта должен записываться с категорией заданий",
);
assert.match(
  String(contractLogs.at(-1)?.message),
  /Scan: Desert scanned/,
  "скан-контракт должен писать локализованное сообщение в английский журнал",
);

const { createReputationSlice } = await import(
  "../src/game/slices/reputation/createReputationSlice.ts"
);
const reputationLogs = [];
const reputationState = {
  raceReputation: { human: 0, synthetic: 0 },
  knownRaces: ["human", "synthetic"],
  addLog: (message, type, category) =>
    reputationLogs.push({ message, type, category }),
};
const setReputationState = (updater) => updater(reputationState);
Object.assign(
  reputationState,
  createReputationSlice(setReputationState, () => reputationState),
);

reputationState.changeReputation("human", 10);

assert.ok(reputationLogs.length >= 2, "изменение репутации должно дать основной лог и риппл");
assert.ok(
  reputationLogs.every(({ category }) => category === "reputation"),
  "основное изменение и риппл репутации должны быть видны в одном фильтре",
);

const { advancePreSpacefaringContact } = await import(
  "../src/game/slices/locations/helpers/preSpacefaringContact.ts"
);
const preSpacefaringLogs = [];
advancePreSpacefaringContact(
  "missing-planet",
  "observe",
  0,
  () => {},
  () => ({
    currentLocation: null,
    outposts: [],
    ship: { tradeGoods: [] },
    addLog: (message, type, category) =>
      preSpacefaringLogs.push({ message, type, category }),
  }),
);

assert.equal(
  preSpacefaringLogs.at(-1)?.category,
  "exploration",
  "события локального контакта должны быть видны в фильтре исследований планет",
);

const { GLOBAL_CRISES } = await import(
  "../src/game/constants/globalCrises.ts"
);
const raiderLogs = [];
const raiderState = {
  turn: 50,
  credits: 100,
  currentSector: { tier: 1 },
  victoryTriggered: false,
  gameVictory: false,
  ship: {
    modules: [
      {
        id: 1,
        type: "engine",
        name: "Двигатель",
        health: 100,
        maxHealth: 100,
        disabled: false,
        manualDisabled: false,
      },
    ],
    tradeGoods: [{ item: "food", quantity: 10 }],
    fuel: 100,
    shields: 10,
  },
  crew: [],
};
const setRaiderState = (updater) =>
  Object.assign(raiderState, updater(raiderState));
const getRaiderState = () => ({
  ...raiderState,
  addLog: (message, type, category) => raiderLogs.push({ message, type, category }),
});
const raiderCrisis = GLOBAL_CRISES.find(({ id }) => id === "raider_wave");
assert.ok(raiderCrisis?.onStartEffect, "у рейдерской волны должен быть стартовый эффект");
raiderCrisis.onStartEffect(setRaiderState, getRaiderState);

assert.ok(
  raiderLogs.every(({ message }) => !/[А-Яа-яЁё]/.test(message)),
  "стартовый журнал кризиса должен быть локализован на английский",
);
assert.ok(
  raiderLogs.every(({ category }) => category === "system"),
  "системные кризисы не должны попадать в фильтр экипажа или боя",
);

const { healCrew } = await import(
  "../src/game/slices/services/helpers/healCrew.ts"
);
const { repairShip } = await import(
  "../src/game/slices/services/helpers/repairShip.ts"
);
const serviceLogs = [];
const serviceState = {
  currentLocation: null,
  currentSector: null,
  credits: 0,
  raceReputation: {},
  crew: [{ health: 100, maxHealth: 100 }],
  ship: {
    modules: [{ health: 100, maxHealth: 100 }],
  },
  addLog: (message, type, category) => serviceLogs.push({ message, type, category }),
};

healCrew(() => {}, () => serviceState);
repairShip(() => {}, () => serviceState);

assert.deepEqual(
  serviceLogs.map(({ message }) => message),
  ["Not needed", "Not needed"],
  "сервис не должен записывать в журнал несуществующий ключ перевода",
);
assert.ok(
  serviceLogs.every(({ category }) => category === "system"),
  "сервисные записи должны иметь системную категорию",
);

for (const sourcePath of [
  "../src/game/components/StationPanel.tsx",
  "../src/game/components/FriendlyShipPanel.tsx",
]) {
  const source = await readFile(new URL(sourcePath, import.meta.url), "utf8");
  assert.doesNotMatch(
    source,
    /addLog\(\s*["`][^"`]*[А-Яа-яЁё]/,
    `${sourcePath}: текст записи журнала должен приходить из каталога`,
  );
}

console.log("Game journal category checks passed");
