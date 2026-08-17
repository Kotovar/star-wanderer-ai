import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { setUiState, patchUiState } from "./register-ui-loader.mjs";

/**
 * Рендерит списки заданий и убеждается, что ни один тип контракта не протекает
 * в интерфейс сырым ключом перевода или неподставленным плейсхолдером.
 * Именно так ломались crisis_response и fabrication: `contracts.desc_fabrication`
 * в заголовке и `{{weapon}}` в тексте предложения.
 */

const { createElement } = await import("react");
const { renderToStaticMarkup } = await import("react-dom/server");
const { ContractsList, getSupplyRunTurnInLocation } = await import(
  "../src/game/components/ContractsList.tsx"
);
const { PirateTab } = await import(
  "../src/game/components/station/PirateTab.tsx"
);
const { ShopTab } = await import("../src/game/components/station/ShopTab.tsx");
const { PlanetPanel } = await import(
  "../src/game/components/PlanetPanel.tsx"
);
const { generatePirateContracts } = await import(
  "../src/game/slices/pirate/contracts.ts"
);
const { STATION_CONFIG } = await import("../src/game/galaxy/config.ts");
const { getStationServiceKeys } = await import(
  "../src/game/stations/discovery.ts"
);
const { formatContractDescription, formatPirateReturnInstruction } = await import(
  "../src/game/contracts/formatContractDescription.ts"
);
const { initializeStationData } = await import(
  "../src/game/stations/initialize.ts"
);
const { sellTradeGood } = await import(
  "../src/game/slices/trade/helpers/sellTradeGood.ts"
);
const { store: i18nStore } = await import("../src/lib/useTranslation.ts");

const PIRATE_SMUGGLING = {
  id: "pirate-smuggling",
  type: "pirate_smuggling",
  desc: "contracts.desc_pirate_smuggling",
  reward: 400,
  cargo: "contraband",
  quantity: 10,
  targetLocationName: "location_names.station_01",
  targetSectorName: "sector_names.sector_11_1",
};
const PIRATE_HEIST = {
  id: "pirate-heist",
  type: "pirate_heist",
  desc: "contracts.desc_pirate_heist",
  reward: 800,
  sourcePlanetId: "pirate-location",
  sourcePlanetName: "Точка Лазаря",
  sourceSectorName: "sector_names.sector_11_1",
  targetLocationId: "heist-target",
  targetLocationName: "Гавань Искра",
  targetSectorName: "sector_names.sector_11_1",
};

assert.equal(i18nStore.t("pirate.black_market"), "ЧЁРНЫЙ РЫНОК");
assert.equal(i18nStore.t("pirate.contract_board"), "ДОСКА ПИРАТСКИХ ЗАДАЧ");

const renderPirateTab = (
  view,
  contrabandPrices = { buy: 300, sell: 200 },
  overrides = {},
) => renderToStaticMarkup(
  createElement(PirateTab, {
    view,
    stationId: "pirate-station",
    locationId: "pirate-location",
    stationPrices: {
      "pirate-station": {
        contraband: contrabandPrices,
      },
    },
    stationStock: { "pirate-station": { contraband: 10 } },
    credits: 1_000,
    ship: { cargo: [], tradeGoods: [] },
    cargoCapacity: 20,
    probes: 0,
    heat: 0,
    standing: 0,
    contracts: [PIRATE_SMUGGLING],
    activeContracts: [],
    completedContractIds: [],
    currentTurn: 1,
    buyTradeGood: () => {},
    sellTradeGood: () => {},
    acceptPirateContract: () => {},
    completePirateContract: () => {},
    reducePirateHeat: () => {},
    ...overrides,
  }),
);

assert.deepEqual(
  getStationServiceKeys("pirate", STATION_CONFIG.pirate),
  [
    "refuel",
    "repairs",
    "probes",
    "scrap",
    "weapon_removal",
    "black_market",
    "pirate_contracts",
    "laundering",
  ],
  "модалка пиратской станции должна перечислять только реальные услуги",
);
assert.deepEqual(
  [
    STATION_CONFIG.pirate.guaranteedProfessions,
    STATION_CONFIG.pirate.guaranteedModules,
    STATION_CONFIG.pirate.guaranteedWeapons,
  ],
  [[], [], []],
  "модалка не должна обещать пиратской станции экипаж, модули или оружие",
);
const pirateMarkup = renderPirateTab("contracts");
assert.ok(
  pirateMarkup.includes("Доставить 10т контрабанды на Меридианская кузница"),
  "пиратский контракт обязан отображаться на выбранном языке",
);
assert.doesNotMatch(
  pirateMarkup,
  /contracts\.desc_pirate_/,
  "сырой ключ пиратского контракта не должен попадать в UI",
);
const pirateHeistMarkup = renderPirateTab("contracts", undefined, {
  contracts: [PIRATE_HEIST],
});
assert.ok(
  pirateHeistMarkup.includes(
    "Взломать Гавань Искра в секторе Гелиос-1 зондом (+15 к розыску)",
  ),
  "карточка налёта должна показывать детерминированный след, а не обещать скрытный уход",
);
assert.equal(
  formatPirateReturnInstruction(PIRATE_HEIST, i18nStore.t.bind(i18nStore)),
  "После операции вернитесь к заказчику: Точка Лазаря (сектор Гелиос-1).",
  "до налёта UI должен говорить о возврате после операции и указывать сектор заказчика",
);
assert.equal(
  formatPirateReturnInstruction(
    { ...PIRATE_HEIST, pirateObjectiveComplete: true },
    i18nStore.t.bind(i18nStore),
  ),
  "Цель выполнена. Вернитесь к заказчику: Точка Лазаря (сектор Гелиос-1).",
  "только выполненная задача должна сообщать о готовности к сдаче",
);
const turnInMarkup = renderPirateTab("contracts", undefined, {
  contracts: [],
  activeContracts: [{ ...PIRATE_HEIST, pirateObjectiveComplete: true }],
});
assert.ok(
  turnInMarkup.includes("СДАТЬ"),
  "активное выполненное задание должно оставаться на доске для сдачи после её обновления",
);

const pirateMarketMarkup = renderPirateTab("market", {
  buy: 615,
  sell: 615,
});
assert.ok(
  pirateMarketMarkup.includes("Снизить розыскиваемость на 15 — 500₢"),
  "кнопка смывки должна объяснять, что именно уменьшится",
);
assert.doesNotMatch(
  pirateMarketMarkup,
  /\{\{-amount\}\}/,
  "в кнопке смывки не должен показываться сырой плейсхолдер",
);
assert.ok(
  pirateMarketMarkup.includes("Купить: 160₢/т | Продать: 159₢/т"),
  "чёрный рынок должен показывать фактический спред контрабанды",
);
for (const label of [
  ">+1</button>",
  ">+5</button>",
  ">+15</button>",
  ">-15</button>",
  ">-5</button>",
  ">-1</button>",
]) {
  assert.ok(
    pirateMarketMarkup.includes(label),
    `чёрный рынок должен показывать партию ${label}`,
  );
}
assert.doesNotMatch(
  pirateMarketMarkup,
  /ДОСКА ПИРАТСКИХ ЗАДАЧ/,
  "во вкладке чёрного рынка не должно быть списка задач",
);

const pirateContractsMarkup = renderPirateTab("contracts");
assert.ok(
  pirateContractsMarkup.includes("ДОСКА ПИРАТСКИХ ЗАДАЧ"),
  "вкладка заданий должна показывать доску контрактов",
);
assert.doesNotMatch(
  pirateContractsMarkup,
  /ЧЁРНЫЙ РЫНОК/,
  "во вкладке заданий не должно быть торговли",
);
i18nStore.changeLanguage("en");
await new Promise((done) => setTimeout(done, 0));
assert.equal(i18nStore.t("pirate.black_market"), "BLACK MARKET");
assert.equal(i18nStore.t("pirate.contract_board"), "PIRATE CONTRACT BOARD");
assert.equal(
  formatContractDescription(PIRATE_SMUGGLING, i18nStore.t.bind(i18nStore)),
  "📦 Deliver 10t of contraband to Meridian Foundry (Helios-1)",
  "английское описание пиратского контракта обязано быть переведено",
);
i18nStore.changeLanguage("ru");

const generatedPirateContracts = generatePirateContracts(
  {
    id: "pirate-station",
    stationId: "pirate-station",
    type: "station",
    name: "Пиратская база",
  },
  2,
  [
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
  ],
);
assert.ok(
  generatedPirateContracts.every((contract) =>
    /^contracts\.desc_pirate_(smuggling|bounty|heist)$/.test(contract.desc),
  ),
  "генератор обязан сохранять ключ перевода, а не текст одного языка",
);

const originalRandom = Math.random;
let pirateContrabandPrices;
try {
  Math.random = () => 0.5;
  pirateContrabandPrices = initializeStationData([
    {
      tier: 2,
      locations: [
        {
          id: "pirate-station",
          type: "station",
          stationId: "pirate-station",
          stationConfig: { isPirate: true, priceDiscount: 0.75 },
        },
      ],
    },
  ]).prices["pirate-station"].contraband;
} finally {
  Math.random = originalRandom;
}
assert.ok(
  pirateContrabandPrices.buy > Math.floor(pirateContrabandPrices.sell * 1.3),
  "новая пиратская станция не должна позволять купить контрабанду дешевле её фактической цены сдачи",
);

let contrabandSaleState = {
  credits: 100,
  activeCrisis: null,
  crew: [],
  raceReputation: {},
  currentLocation: {
    stationId: "regular-station",
    stationConfig: { isPirate: false },
  },
  stationPrices: {
    "regular-station": { contraband: { buy: 300, sell: 200 } },
  },
  ship: { tradeGoods: [{ item: "contraband", quantity: 1 }] },
};
const contrabandSaleLogs = [];
const setContrabandSaleState = (update) => {
  const patch = typeof update === "function"
    ? update(contrabandSaleState)
    : update;
  contrabandSaleState = { ...contrabandSaleState, ...patch };
};
const getContrabandSaleState = () => ({
  ...contrabandSaleState,
  addLog: (message) => contrabandSaleLogs.push(message),
});

sellTradeGood(
  setContrabandSaleState,
  getContrabandSaleState,
  "contraband",
  1,
);
assert.equal(
  contrabandSaleState.credits,
  100,
  "обычная станция не должна платить за контрабанду",
);
assert.equal(
  contrabandSaleState.ship.tradeGoods[0]?.quantity,
  1,
  "обычная станция не должна забирать контрабанду",
);
assert.ok(
  contrabandSaleLogs.includes(
    i18nStore.t("game_logs.err_contraband_pirate_only"),
  ),
  "игрок должен получить локализованную причину отказа",
);
contrabandSaleState = {
  ...contrabandSaleState,
  currentLocation: {
    ...contrabandSaleState.currentLocation,
    stationConfig: { isPirate: true },
  },
};
sellTradeGood(
  setContrabandSaleState,
  getContrabandSaleState,
  "contraband",
  1,
);
assert.equal(
  contrabandSaleState.credits,
  152,
  "пиратская станция должна покупать контрабанду с чёрнорыночной надбавкой",
);
assert.equal(
  contrabandSaleState.ship.tradeGoods.length,
  0,
  "принятую пиратской станцией контрабанду нужно убрать из трюма",
);

const supplyTurnIn = getSupplyRunTurnInLocation(
  {
    sourceName: "Таласса",
    sourceSectorName: "Гелиос-1",
    sourceType: "planet",
  },
  i18nStore.t.bind(i18nStore),
);
assert.equal(
  supplyTurnIn,
  'Планета "Таласса" (Гелиос-1)',
  "where-to-turn-in must name only the receiving location",
);
assert.doesNotMatch(
  supplyTurnIn,
  /Купить|найти в другом месте/,
  "where-to-turn-in must not repeat the goods-acquisition hint",
);

const FABRICATION = {
  id: "c-fab",
  type: "fabrication",
  desc: "contracts.desc_fabrication",
  reward: 900,
  requiredWeaponType: "drones",
  sourcePlanetId: "p1",
  sourcePlanetName: "Церера-3",
  sourceSectorName: "Меридиан-1",
  sourceDominantRace: "human",
};

const CRISIS_RESPONSE = {
  id: "c-crisis",
  type: "crisis_response",
  desc: "contracts.desc_crisis_response",
  reward: 1200,
  cargo: "medicine",
  quantity: 16,
  crisisId: "epidemic",
  crisisName: "crises.epidemic.name",
  sourcePlanetId: "p1",
  sourcePlanetName: "Церера-3",
  sourceSectorName: "Меридиан-1",
  sourceDominantRace: "human",
};

const SYNTHETIC_RESEARCH = {
  id: "c-synthetic-research",
  type: "research",
  desc: "contracts.desc_research_synth",
  reward: 700,
  requiresTechResearch: true,
  requiredTechTier: 2,
  requiredRace: "synthetic",
  isRaceQuest: true,
  timeLimit: 15,
};

patchUiState({
  activeContracts: [FABRICATION, CRISIS_RESPONSE],
  completedContractIds: [],
  cancelContract: () => {},
  turn: 5,
  addLog: () => {},
  ship: { cargo: [], tradeGoods: [] },
  raceReputation: {},
  artifacts: [],
  research: { researchedTechs: [], unlockedRecipes: ["drones"] },
  galaxy: { sectors: [] },
  activeCrisis: { id: "epidemic", turnsRemaining: 20 },
  completedLocations: [],
});

const markup = renderToStaticMarkup(createElement(ContractsList));

// ── Ни сырых ключей, ни неподставленных плейсхолдеров ───────────────────────
assert.doesNotMatch(
  markup,
  /contracts\.(desc|name|type)_/,
  "сырой ключ перевода протёк в список заданий",
);
assert.doesNotMatch(
  markup,
  /\{\{\w+\}\}/,
  "неподставленный плейсхолдер протёк в список заданий",
);
assert.doesNotMatch(markup, /crises\.\w+\.name/, "имя кризиса не переведено");

// ── Оба типа реально отрисовались под своими именами ────────────────────────
assert.ok(
  markup.includes("Боевые дроны"),
  "заказ на изготовление обязан называть нужное орудие",
);
assert.ok(
  markup.includes("Медикаменты"),
  "отклик на кризис обязан называть нужный груз",
);

setUiState({
  activeContracts: [{
    id: "friendly-bounty",
    type: "bounty",
    desc: "contracts.desc_bounty_generic",
    reward: 500,
    bountyTier: "friendly",
    reputationReward: 4,
    sourceDominantRace: "human",
  }],
  completedContractIds: [],
  ship: { cargo: [], tradeGoods: [] },
  raceReputation: {},
  artifacts: [],
  research: { researchedTechs: [], unlockedRecipes: [] },
  galaxy: { sectors: [] },
  activeCrisis: null,
  completedLocations: [],
  frontierSubsidy: null,
});
const friendlyBountyMarkup = renderToStaticMarkup(createElement(ContractsList));
assert.ok(
  friendlyBountyMarkup.includes("ДРУЖЕСКАЯ НАГРАДА · +4 репутации"),
  "дружественная награда обязана явно показывать её уровень и +4 репутации",
);

patchUiState({
  frontierSubsidy: {
    targetStationId: "frontier-military",
    weaponBayAvailable: true,
    weaponAvailable: true,
  },
  research: { researchedTechs: [] },
  ship: { modules: [{ id: 1, type: "weaponbay", weapons: [null] }] },
});
const subsidizedShopMarkup = renderToStaticMarkup(
  createElement(ShopTab, {
    stationId: "frontier-military",
    stationItems: [{
      id: "frontier-laser",
      type: "weapon",
      weaponType: "laser",
      moduleType: "weaponbay",
      price: 255,
      basePrice: 300,
      stock: 1,
      name: "Laser",
      description: "Laser",
      requiresWeaponBay: true,
    }],
    stationInventory: { "frontier-military": {} },
    credits: 0,
    ship: { modules: [{ id: 1, type: "weaponbay", weapons: [null] }] },
    buyItem: () => {},
    onUpgradeClick: () => {},
  }),
);
assert.ok(
  subsidizedShopMarkup.includes("Субсидия дальнего рубежа: −200₢"),
  "магазин обязан показывать применённую субсидию",
);
assert.ok(
  subsidizedShopMarkup.includes("💰 55 ₢"),
  "магазин обязан показывать итоговую цену",
);
assert.match(
  subsidizedShopMarkup,
  /<button[^>]*disabled=""/,
  "недостающие после фиксированной субсидии кредиты должны блокировать покупку",
);

patchUiState({
  activeContracts: [FABRICATION, CRISIS_RESPONSE],
  ship: { cargo: [], tradeGoods: [] },
  research: { researchedTechs: [], unlockedRecipes: ["drones"] },
  activeCrisis: { id: "epidemic", turnsRemaining: 20 },
  frontierSubsidy: null,
});

// ── И то же самое на английском: имена не должны застревать по-русски ───────
i18nStore.changeLanguage("en");
// Английский каталог грузится отдельным чанком — дождёмся его
await new Promise((done) => setTimeout(done, 0));
assert.equal(
  i18nStore.t("weapon_types.drones"),
  "Combat Drones",
  "английский каталог не загрузился — проверка была бы бессмысленной",
);
const englishMarkup = renderToStaticMarkup(createElement(ContractsList));
assert.doesNotMatch(
  englishMarkup,
  /[А-Яа-яЁё]/,
  "русские названия протекли в английский интерфейс",
);
assert.ok(
  englishMarkup.includes("Combat Drones"),
  "оружие обязано называться по-английски",
);
assert.ok(
  englishMarkup.includes("Medicine"),
  "груз помощи обязан называться по-английски",
);
i18nStore.changeLanguage("ru");

// ── Прогресс виден: в списке он рисуется полосой, ширина = доля выполнения ──
const bars = (html) => [...html.matchAll(/width:\s*([\d.]+)%/g)].map((m) => m[1]);
assert.deepEqual(
  bars(markup),
  ["0", "0"],
  "пустой трюм обязан давать нулевой прогресс обоим заданиям",
);

// ── С готовым предметом в трюме прогресс закрывается, появляется метка ──────
patchUiState({
  ship: {
    cargo: [
      {
        item: "crafted_weapon_drones",
        quantity: 1,
        isCraftedWeapon: true,
        weaponType: "drones",
      },
    ],
    tradeGoods: [{ item: "medicine", quantity: 16 }],
  },
});
const readyMarkup = renderToStaticMarkup(createElement(ContractsList));
assert.deepEqual(
  bars(readyMarkup),
  ["100", "100"],
  "собранное орудие и гружёные медикаменты обязаны закрывать прогресс",
);
assert.equal(
  (readyMarkup.match(/contracts\.ready_badge|ГОТОВО|READY/gi) ?? []).length > 0,
  true,
  "готовое задание обязано получать метку готовности",
);

// ── Экраны крафта: тот же объект не должен называться по-разному ────────────
const { BlueprintsTab } = await import(
  "../src/game/components/BlueprintsTab.tsx"
);
patchUiState({
  research: {
    researchedTechs: [],
    unlockedRecipes: [
      "plasma",
      "drones",
      "antimatter",
      "quantum_torpedo",
      "ion_cannon",
    ],
  },
  moduleRecipes: [
    "bio_research_lab",
    "pulse_drive",
    "habitat_module",
    "deep_survey_array",
  ],
});
i18nStore.changeLanguage("en");
const blueprintsMarkup = renderToStaticMarkup(createElement(BlueprintsTab));
assert.doesNotMatch(
  blueprintsMarkup,
  /[А-Яа-яЁё]/,
  "русские названия рецептов протекли в английский интерфейс чертежей",
);
assert.ok(
  blueprintsMarkup.includes("Ion Cannon"),
  "рецепт оружия обязан называться так же, как в заказе на изготовление",
);
assert.ok(
  blueprintsMarkup.includes("Deep Survey Array"),
  "рецепт гибридного модуля тоже обязан переводиться",
);
i18nStore.changeLanguage("ru");
const blueprintsRu = renderToStaticMarkup(createElement(BlueprintsTab));
assert.ok(
  blueprintsRu.includes("Ионная пушка"),
  "русский каталог обязан продолжать работать",
);

// ── Все типы контрактов имеют человеческое имя, а не ключ ───────────────────
const contractTypesSource = readFileSync(
  new URL("../src/game/types/contracts.ts", import.meta.url),
  "utf8",
);
const declaredTypes = contractTypesSource
  .slice(contractTypesSource.indexOf("export type ContractType"))
  .split(";")[0]
  .match(/"([a-z_]+)"/g)
  .map((quoted) => quoted.replaceAll('"', ""));
const listSource = readFileSync(
  new URL("../src/game/components/ContractsList.tsx", import.meta.url),
  "utf8",
);
const statusSwitch = listSource.slice(
  listSource.indexOf("const getStatusText"),
  listSource.indexOf("const getContractDetails"),
);
for (const type of declaredTypes) {
  assert.ok(
    statusSwitch.includes(`case "${type}"`),
    `${type} не назван в getStatusText — в списке заданий покажется сырой ключ`,
  );
}

setUiState({
  currentLocation: {
    id: "synthetic-planet",
    type: "planet",
    name: "Синтетическая планета",
    planetType: "Ледяная",
    dominantRace: "synthetic",
    contracts: [SYNTHETIC_RESEARCH],
  },
  credits: 0,
  activeContracts: [],
  completedContractIds: [],
  raceReputation: { synthetic: 0 },
  galaxy: { sectors: [] },
  completedLocations: [],
  artifacts: [],
  research: { researchedTechs: [], unlockedRecipes: [] },
  activeCrisis: null,
  acceptContract: () => {},
  completeDeliveryContract: () => {},
  showSectorMap: () => {},
  discoverRace: () => {},
  knownRaces: ["synthetic"],
  ship: { cargo: [], tradeGoods: [] },
  activeExpedition: null,
  planetCooldowns: {},
});
const syntheticOfferMarkup = renderToStaticMarkup(createElement(PlanetPanel));
const acceptButton = syntheticOfferMarkup.match(
  /<button(?=[^>]*>ПРИНЯТЬ<\/button>)[^>]*>/,
);
assert.ok(acceptButton, "кнопка принятия контракта не отрисовалась");
assert.doesNotMatch(
  acceptButton[0],
  /\sdisabled(?:=|\s|>)/,
  "контракт должен приниматься с нулевым балансом кредитов",
);
assert.ok(
  syntheticOfferMarkup.includes(
    "Завершить исследование технологии продвинутого уровня",
  ),
  "предложение должно заранее объяснять исследовательскую цель",
);
assert.ok(
  !syntheticOfferMarkup.includes("Срок:"),
  "анализ данных Древних не должен показывать срок",
);

// ── Контракт дальнего рубежа должен быть отличим до и после принятия ───────
const FRONTIER_DELIVERY = {
  id: "frontier-delivery",
  type: "delivery",
  desc: "contracts.name_delivery",
  reward: 100,
  cargo: "fuel",
  quantity: 1,
  targetLocationId: "frontier-target",
  targetSectorName: "Меридиан-1",
  targetLocationName: "Гелиос",
  targetLocationType: "planet",
  progressionTrack: "frontier",
};
const ORDINARY_DELIVERY = {
  ...FRONTIER_DELIVERY,
  id: "ordinary-delivery",
  progressionTrack: undefined,
};

setUiState({
  currentLocation: {
    id: "frontier-planet",
    type: "planet",
    name: "Фронтир",
    dominantRace: "human",
    contracts: [FRONTIER_DELIVERY, ORDINARY_DELIVERY],
  },
  credits: 0,
  activeContracts: [],
  completedContractIds: [],
  raceReputation: { human: 0 },
  galaxy: {
    sectors: [{
      id: 1,
      locations: [{ id: "frontier-target", type: "station" }],
    }],
  },
  completedLocations: [],
  artifacts: [],
  research: { researchedTechs: [], unlockedRecipes: [] },
  activeCrisis: null,
  acceptContract: () => {},
  completeDeliveryContract: () => {},
  showSectorMap: () => {},
  discoverRace: () => {},
  knownRaces: ["human"],
  ship: { cargo: [], tradeGoods: [] },
  activeExpedition: null,
  planetCooldowns: {},
  frontierChainClosed: false,
  frontierContractsCompleted: 0,
  frontierSubsidy: null,
  cancelContract: () => {},
  turn: 5,
  addLog: () => {},
});
const frontierUnstartedMarkup = renderToStaticMarkup(createElement(ContractsList));
assert.ok(
  !frontierUnstartedMarkup.includes("Контракты дальнего рубежа"),
  "линейка дальнего рубежа не должна отображаться среди активных заданий до принятия первого контракта",
);
const frontierOfferMarkup = renderToStaticMarkup(createElement(PlanetPanel));
assert.equal(
  frontierOfferMarkup.split("Поручение дальнего рубежа").length - 1,
  1,
  "на доске только контракт дальнего рубежа должен быть явно отмечен",
);

patchUiState({ activeContracts: [FRONTIER_DELIVERY, ORDINARY_DELIVERY] });
const frontierActiveMarkup = renderToStaticMarkup(createElement(ContractsList));
assert.ok(
  frontierActiveMarkup.includes("Контракты дальнего рубежа"),
  "линейка дальнего рубежа должна отображаться после принятия первого контракта",
);
assert.equal(
  frontierActiveMarkup.split("Поручение дальнего рубежа").length - 1,
  1,
  "после принятия метка должна остаться только у контракта дальнего рубежа",
);
assert.match(
  frontierActiveMarkup,
  /<div class="mt-1"><span[^>]*>Поручение дальнего рубежа<\/span><\/div>/,
  "метка дальнего рубежа должна располагаться отдельной строкой под типом задания",
);

i18nStore.changeLanguage("en");
await new Promise((done) => setTimeout(done, 0));
const frontierEnglishMarkup = renderToStaticMarkup(createElement(ContractsList));
assert.equal(
  frontierEnglishMarkup.split("Frontier Assignment").length - 1,
  1,
  "английская метка контракта дальнего рубежа должна быть локализована",
);
i18nStore.changeLanguage("ru");

patchUiState({ frontierChainClosed: true });
const closedFrontierActiveMarkup = renderToStaticMarkup(createElement(ContractsList));
assert.doesNotMatch(
  closedFrontierActiveMarkup,
  /Поручение дальнего рубежа/,
  "после закрытия цепочки активный контракт не должен выглядеть как следующее поручение",
);

patchUiState({ activeContracts: [] });
const closedFrontierOfferMarkup = renderToStaticMarkup(createElement(PlanetPanel));
assert.doesNotMatch(
  closedFrontierOfferMarkup,
  /Поручение дальнего рубежа/,
  "после закрытия цепочки оставшееся предложение не должно выглядеть как следующее поручение",
);

// Старые сохранения хранят русские desc, типы планет и имена грузов. Они не
// должны протекать на английский ни на доску планеты, ни в активные задания.
const LEGACY_DELIVERY = {
  id: "legacy-delivery",
  type: "delivery",
  desc: "📦 Доставка: Запчасти",
  reward: 120,
  cargo: "spares",
  quantity: 10,
  targetLocationId: "legacy-target-station",
  targetLocationName: "location_names.station_01",
  targetLocationType: "station",
  targetSectorName: "sector_names.sector_11_1",
};
const LEGACY_SUPPLY = {
  id: "legacy-supply",
  type: "supply_run",
  desc: "📦 Поставка: Вода",
  reward: 90,
  cargo: "water",
  quantity: 5,
  sourcePlanetName: "location_names.planet_01",
  sourceSectorName: "sector_names.sector_11_1",
  sourceType: "planet",
};
const LEGACY_SCAN = {
  id: "legacy-scan",
  type: "scan_planet",
  desc: "contracts.desc_scan",
  reward: 100,
  planetType: "Ледяная",
  requiresVisit: 1,
};
setUiState({
  currentLocation: {
    id: "legacy-source-planet",
    type: "planet",
    name: "location_names.planet_01",
    planetType: "Ледяная",
    dominantRace: "human",
    contracts: [LEGACY_DELIVERY, LEGACY_SUPPLY, LEGACY_SCAN],
  },
  activeContracts: [],
  completedContractIds: [],
  credits: 0,
  raceReputation: { human: 0 },
  galaxy: {
    sectors: [{
      id: 1,
      locations: [{ id: "legacy-target-station", type: "station" }],
    }],
  },
  completedLocations: [],
  artifacts: [],
  research: { researchedTechs: [], unlockedRecipes: [] },
  activeCrisis: null,
  acceptContract: () => {},
  completeDeliveryContract: () => {},
  showSectorMap: () => {},
  discoverRace: () => {},
  knownRaces: ["human"],
  ship: { cargo: [], tradeGoods: [] },
  activeExpedition: null,
  planetCooldowns: {},
  frontierChainClosed: false,
  frontierContractsCompleted: 0,
  frontierSubsidy: null,
  cancelContract: () => {},
  turn: 5,
  addLog: () => {},
});
i18nStore.changeLanguage("en");
await new Promise((done) => setTimeout(done, 0));
const legacyPlanetMarkup = renderToStaticMarkup(createElement(PlanetPanel));
patchUiState({ activeContracts: [LEGACY_DELIVERY, LEGACY_SUPPLY, LEGACY_SCAN] });
const legacyContractsMarkup = renderToStaticMarkup(createElement(ContractsList));
assert.doesNotMatch(
  legacyPlanetMarkup,
  /Доставка|Поставка|Запчасти|Вода|Ледяная/,
  "старые планетные задания не должны показывать русский текст в английской доске",
);
assert.doesNotMatch(
  legacyContractsMarkup,
  /Доставка|Поставка|Запчасти|Вода|Ледяная/,
  "старые планетные задания не должны показывать русский текст в английском списке",
);
i18nStore.changeLanguage("ru");

console.log("Contract label checks passed");
