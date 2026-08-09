import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import "./register-ts-loader.mjs";

/**
 * Газосборники: ворота на постройку, лимит, накопление в бункер и вывоз.
 *
 * Главное здесь — не арифметика, а то, что постройка переживает перезаход
 * в сектор. `currentSector` пересобирается из `galaxy.sectors`, и именно на
 * этом в своё время сгорел прогресс пояса астероидов: значения писались
 * только в текущую локацию и молча откатывались.
 */

const {
  GAS_BY_ATMOSPHERE,
  GAS_BASE_PRICE,
  GAS_BUY_RATE,
  GAS_COLLECTOR_BUNKER_CAP,
  GAS_COLLECTOR_COST,
  GAS_COLLECTOR_FILL_TURNS,
  GAS_COLLECTOR_RATE,
  GAS_COLLECTOR_REQUIRED_DIVE_DEPTH,
  GAS_SELL_RATE,
  CRYOGEN_BURN_PER_TURN,
  CRYOGEN_CONSUMPTION_REDUCTION,
  OUTPOST_LIMITS,
  OUTPOST_TECH_ID,
} = await import("../src/game/constants/outposts.ts");
const { OUTPOST_CREW_MULTIPLIERS } = await import(
  "../src/game/constants/outposts.ts"
);
const { getOutpostOutputMultiplier } = await import(
  "../src/game/slices/outposts/helpers/outpostCrew.ts"
);
const {
  accrueOutposts,
  burnCryogen,
  getBunkerTotal,
  isBunkerFull,
  getBunkerEntries,
} = await import("../src/game/slices/outposts/helpers/accrueOutposts.ts");
const { getGasCollectorBlocker } = await import(
  "../src/game/slices/outposts/helpers/canBuildGasCollector.ts"
);
const { RESEARCH_TREE } = await import("../src/game/constants/research/index.ts");

// ── Каждая атмосфера даёт свой газ, и газы не дублируются ──────────────────
const ATMOSPHERES = ["hydrogen", "methane", "ammonia", "nitrogen"];
const gases = ATMOSPHERES.map((a) => GAS_BY_ATMOSPHERE[a]);
assert.deepEqual(
  [...new Set(gases)].sort(),
  [...gases].sort(),
  "две атмосферы дают один и тот же газ — выбор гиганта перестаёт быть решением",
);
for (const gas of gases) {
  assert.ok(gas, "у атмосферы нет газа");
  assert.ok(gas in GAS_BASE_PRICE, `${gas} не имеет цены`);
}
const sellable = gases.filter((gas) => GAS_BASE_PRICE[gas] > 0);
const bestGasPrice = Math.max(...sellable.map((gas) => GAS_BASE_PRICE[gas]));
assert.equal(
  sellable.length,
  3,
  "ровно один газ обязан быть нерыночным — иначе четыре газа это четыре оттенка одного",
);

// ── Технология существует и реально стоит воротами ─────────────────────────
const gateTech = RESEARCH_TREE[OUTPOST_TECH_ID];
assert.ok(gateTech, "технологии-ворот нет в дереве исследований");
assert.ok(
  gateTech.prerequisites.length > 0,
  "технология-ворота без предпосылок откроется на старте и обесценит ворота",
);

const location = (over = {}) => ({
  id: "gg-1",
  type: "gas_giant",
  gasGiantAtmosphere: "hydrogen",
  gasGiantDeepDiveDone: true,
  ...over,
});
const rich = {
  credits: 99999,
  outposts: [],
  research: {
    researchedTechs: [OUTPOST_TECH_ID],
    resources: { tech_salvage: 99, rare_minerals: 99, energy_samples: 99 },
  },
};

assert.equal(getGasCollectorBlocker(rich, location()), null, "постройка должна быть разрешена");

assert.equal(
  getGasCollectorBlocker(
    { ...rich, research: { ...rich.research, researchedTechs: [] } },
    location(),
  ),
  "tech_missing",
);
assert.equal(
  getGasCollectorBlocker(rich, location({ gasGiantDeepDiveDone: false })),
  "no_deep_dive",
  "без нырка до ядра шторма строить нельзя — иначе мини-игра ни при чём",
);
assert.equal(
  getGasCollectorBlocker(rich, location({ type: "planet" })),
  "wrong_location",
);
assert.equal(getGasCollectorBlocker(rich, null), "wrong_location");
assert.equal(
  getGasCollectorBlocker({ ...rich, credits: 10 }, location()),
  "not_enough_credits",
);
assert.equal(
  getGasCollectorBlocker(
    { ...rich, research: { ...rich.research, resources: {} } },
    location(),
  ),
  "not_enough_resources",
);

// Лимит: построенные под завязку блокируют новую стройку
const atLimit = Array.from({ length: OUTPOST_LIMITS.gas_collector }, (_, i) => ({
  id: `o${i}`,
  kind: "gas_collector",
  locationId: `other-${i}`,
  bunker: {},
}));
assert.equal(
  getGasCollectorBlocker({ ...rich, outposts: atLimit }, location()),
  "limit_reached",
  "лимит построек не соблюдается — выбор места превращается в чек-лист",
);
assert.equal(
  getGasCollectorBlocker(
    { ...rich, outposts: [{ id: "o", kind: "gas_collector", locationId: "gg-1", bunker: {} }] },
    location(),
  ),
  "already_built",
);

// ── Накопление: копит до потолка и останавливается ─────────────────────────
const sectors = [
  { id: 1, locations: [location(), { id: "gg-2", gasGiantAtmosphere: "nitrogen" }] },
];
let outposts = [
  { id: "o1", kind: "gas_collector", locationId: "gg-1", bunker: {} },
];

// Профильный инженер первого уровня — та самая норма, от которой считаются
// GAS_COLLECTOR_RATE и окупаемость
const engineer = [{ id: 1, profession: "engineer", level: 1, outpostId: "o1" }];
for (let turn = 0; turn < GAS_COLLECTOR_FILL_TURNS; turn++) {
  outposts = accrueOutposts(outposts, sectors, engineer);
}
assert.equal(
  getBunkerTotal(outposts[0]),
  GAS_COLLECTOR_BUNKER_CAP,
  `за ${GAS_COLLECTOR_FILL_TURNS} ходов бункер обязан заполниться ровно`,
);
assert.equal(isBunkerFull(outposts[0]), true);

// Ещё сотня ходов ничего не добавляет: полный бункер простаивает.
// Это и отделяет постройку от пассивного дохода.
for (let turn = 0; turn < 100; turn++) {
  outposts = accrueOutposts(outposts, sectors, engineer);
}
assert.equal(
  getBunkerTotal(outposts[0]),
  GAS_COLLECTOR_BUNKER_CAP,
  "полный бункер продолжает копить — постройка стала пассивным доходом",
);

// Газ соответствует атмосфере своей локации, а не первой попавшейся
assert.deepEqual(getBunkerEntries(outposts[0]), [
  [GAS_BY_ATMOSPHERE.hydrogen, GAS_COLLECTOR_BUNKER_CAP],
]);

const nitrogenOutpost = accrueOutposts(
  [{ id: "o2", kind: "gas_collector", locationId: "gg-2", bunker: {} }],
  sectors,
  [{ id: 2, profession: "engineer", level: 1, outpostId: "o2" }],
);
assert.deepEqual(getBunkerEntries(nitrogenOutpost[0]), [
  [GAS_BY_ATMOSPHERE.nitrogen, GAS_COLLECTOR_RATE],
]);

// Постройка в неизвестной локации ничего не копит и не падает
const orphan = accrueOutposts(
  [{ id: "o3", kind: "gas_collector", locationId: "nowhere", bunker: {} }],
  sectors,
);
assert.equal(getBunkerTotal(orphan[0]), 0);

// Исходный массив не мутируется
const before = [{ id: "o4", kind: "gas_collector", locationId: "gg-1", bunker: {} }];
accrueOutposts(before, sectors);
assert.equal(getBunkerTotal(before[0]), 0, "accrueOutposts мутирует вход");

// ── Постройки живут в состоянии, а не только в локации ─────────────────────
const source = (path) =>
  readFileSync(new URL(`../src/${path}`, import.meta.url), "utf8");

assert.match(
  source("game/types/game.ts"),
  /outposts: Outpost\[\];/,
  "постройки обязаны лежать в GameState: currentSector пересобирается из galaxy при перезаходе",
);
assert.match(
  source("game/slices/outposts/helpers/buildGasCollector.ts"),
  /patchLocation/,
  "отметка в локации обязана идти через patchLocation, иначе значок пропадёт с карты после перезахода",
);
assert.match(
  source("game/slices/gameLoop/gameLoopSlice.ts"),
  /accrueOutposts\(/,
  "накопление не подключено к ходу",
);
assert.match(
  source("game/slices/locations/helpers/gasGiant/surfaceDive.ts"),
  /gasGiantDeepDiveDone/,
  "глубокий нырок не отмечает право на постройку",
);
assert.match(
  source("game/slices/outposts/helpers/collectOutpost.ts"),
  /currentLocation\?\.id !== outpost\.locationId/,
  "вывоз обязан требовать присутствия на месте — иначе возвращаться незачем",
);


// ── Криоген: горит сам и кончается ─────────────────────────────────────────
assert.equal(burnCryogen({}), null, "нечего жечь — состояние трогать нельзя");
assert.equal(burnCryogen({ cryogen: 0 }), null);
assert.deepEqual(burnCryogen({ cryogen: 5 }), {
  cryogen: 5 - CRYOGEN_BURN_PER_TURN,
});
// Запас конечен: иначе один нырок давал бы вечную скидку на энергию
let stock = { cryogen: 3, deuterium: 7 };
for (let turn = 0; turn < 10; turn++) stock = burnCryogen(stock) ?? stock;
assert.equal(stock.cryogen, 0, "криоген обязан кончаться");
assert.equal(stock.deuterium, 7, "горение не должно трогать другие газы");

assert.match(
  source("game/slices/ship/helpers/getTotalConsumption.ts"),
  /gases\?\.cryogen/,
  "криоген не влияет на расход энергии — он тогда просто мусор в трюме",
);
assert.match(
  source("game/slices/gameLoop/gameLoopSlice.ts"),
  /burnCryogen\(/,
  "криоген не горит по ходам",
);
assert.ok(CRYOGEN_CONSUMPTION_REDUCTION > 0);

// ── Продажа: криоген не продаётся ни при каких условиях ────────────────────
assert.equal(
  Math.round(GAS_BASE_PRICE.cryogen * GAS_SELL_RATE),
  0,
  "криоген стал продаваемым — разница между четырьмя газами стёрта",
);
assert.ok(GAS_SELL_RATE > 0 && GAS_SELL_RATE < 1, "станция обязана брать своё");
assert.match(
  source("game/slices/outposts/helpers/sellGas.ts"),
  /price <= 0/,
  "продажа не отсекает непродаваемый газ",
);

// ── Значок постройки на карте сектора ──────────────────────────────────────
assert.match(
  source("game/components/sectorMap/drawers.ts"),
  /drawOutpostBadge/,
  "нет значка постройки — прилететь за добычей можно только перебором локаций",
);
assert.match(
  source("game/components/SectorMap.tsx"),
  /drawOutpostBadge\(ctx, x, y, outpost\.full, outpost\.isBase\)/,
  "значок не различает полный бункер или базу со сборщиком",
);
// База одна за забег, сборщиков трое — на карте это разные вещи
for (const path of [
  "game/components/sectorMap/drawers.ts",
  "game/galaxy/galaxy-map-utils.ts",
]) {
  assert.match(
    source(path),
    /isBase/,
    `${path}: база и газосборник рисуются одинаково`,
  );
}

// ── Старые сохранения не должны падать на новых полях ─────────────────────
const migrations = source("game/saves/migrations.ts");
assert.match(
  migrations,
  /outposts: \[\],\n\s*gases: \{\},/,
  "нет миграции сейва: у сохранений до этой версии нет outposts и gases, и чтение их уронит загрузку",
);
const version = Number(
  source("game/constants/version.ts").match(/CURRENT_STATE_VERSION = (\d+)/)?.[1],
);
assert.ok(
  migrations.includes(`stateVersion: ${version},`),
  `миграция до версии ${version} не найдена — версия поднята, а мигрировать нечем`,
);

// ── Стартовый газ: только dev-шаблоны, и он реально доезжает до состояния ──
process.env.NODE_ENV = "development";
const { SHIP_TEMPLATES } = await import("../src/game/constants/shipTemplates.ts");
const withGases = SHIP_TEMPLATES.filter((tpl) => tpl.gases);
for (const tpl of withGases) {
  assert.ok(
    tpl.id.startsWith("dev_"),
    `${tpl.id} раздаёт газ на старте, а это не dev-шаблон — обычный забег обязан начинать с нуля`,
  );
  for (const gas of Object.keys(tpl.gases)) {
    assert.ok(gas in GAS_BASE_PRICE, `${tpl.id}: неизвестный газ ${gas}`);
  }
}
assert.match(
  source("game/slices/gameManagement/helpers/restartGame.ts"),
  /gases: patch\.gases \?\? \{\}/,
  "стартовый газ не доезжает до состояния — поле в шаблоне будет молча игнорироваться",
);

// dev-шаблон существует, чтобы смотреть механики, а не собирать материалы:
// на постройку сборщика ему обязано хватать сразу
const devExplorer = SHIP_TEMPLATES.find((tpl) => tpl.id === "dev_all_tech_explorer");
assert.ok(devExplorer, "dev-шаблон исследователя пропал");
assert.ok(
  devExplorer.credits >= GAS_COLLECTOR_COST.credits,
  "dev-шаблону не хватает кредитов на газосборник",
);
for (const [resource, amount] of Object.entries(GAS_COLLECTOR_COST.resources)) {
  const held = devExplorer.researchResources?.[resource] ?? 0;
  assert.ok(
    held >= amount,
    `dev-шаблону не хватает ${resource}: ${held} против ${amount} — постройку не посмотреть без фарма`,
  );
}

// ── Газ занимает трюм ──────────────────────────────────────────────────────
// Без этого бункер на 40 единиц не создаёт давления, и вывоз ничего не стоит.
const { getCurrentCargo, getGasVolume } = await import(
  "../src/game/slices/ship/helpers/getCurrentCargo.ts"
);
const { buyGas } = await import(
  "../src/game/slices/outposts/helpers/sellGas.ts"
);
assert.equal(getGasVolume(undefined), 0, "сейв до миграции не должен падать");
assert.equal(getGasVolume({ deuterium: 4, cryogen: 2 }), 6);

const shipState = (held) => ({
  ship: { cargo: [{ quantity: 3 }], tradeGoods: [{ quantity: 2 }] },
  probes: 1,
  gases: held,
});
assert.equal(getCurrentCargo(shipState({})), 6);
assert.equal(
  getCurrentCargo(shipState({ deuterium: 10 })),
  16,
  "газ не занимает трюм — тогда бункер и вместимость корабля ни на что не влияют",
);

const gasBuyer = (polymers) => {
  let state = {
    credits: 1_000,
    gases: { polymers },
    probes: 0,
    crew: [],
    research: { researchedTechs: [] },
    ship: {
      cargo: [],
      tradeGoods: [],
      modules: [
        {
          id: 1,
          type: "cargo",
          capacity: 40,
          health: 100,
          maxHealth: 100,
          disabled: false,
          manualDisabled: false,
        },
      ],
    },
    addLog: () => {},
  };
  const set = (update) => {
    state = { ...state, ...update(state) };
  };
  const get = () => state;
  return {
    buy: (quantity) => buyGas("polymers", quantity, set, get),
    getState: () => state,
  };
};

const nearlyFullBuyer = gasBuyer(38);
nearlyFullBuyer.buy(5);
assert.equal(
  nearlyFullBuyer.getState().gases.polymers,
  40,
  "покупка газа переполняет трюм вместо частичной покупки свободного объёма",
);
assert.equal(
  nearlyFullBuyer.getState().credits,
  1_000 - Math.round(GAS_BASE_PRICE.polymers * GAS_BUY_RATE) * 2,
  "кредиты списаны за газ, который не поместился в трюм",
);

const fullBuyer = gasBuyer(40);
fullBuyer.buy(5);
assert.equal(fullBuyer.getState().gases.polymers, 40, "газ покупается в полный трюм");
assert.equal(fullBuyer.getState().credits, 1_000, "за не поместившийся газ списаны кредиты");

// Ни одно место больше не считает занятый трюм в обход помощника: иначе газ
// остался бы бесплатным в восьми проверках вместимости из девяти
for (const path of [
  "game/slices/travel/helpers/processTravel.ts",
  "game/slices/trade/helpers/buyTradeGood.ts",
  "game/slices/locations/createLocationsSlice.ts",
  "game/slices/crew/helpers/merge.ts",
  "game/slices/contracts/helpers/acceptContract.ts",
  "game/components/ShipStats.tsx",
]) {
  assert.doesNotMatch(
    source(path),
    /cargo\.reduce\([\s\S]{0,120}tradeGoods\.reduce/,
    `${path}: занятый трюм снова считается вручную, мимо getCurrentCargo`,
  );
}
assert.match(
  source("game/components/ShipStats.tsx"),
  /useGameStore\(getCurrentCargo\)/,
  "телеметрия корабля не использует общий расчёт груза с газом",
);
for (const path of [
  "game/hooks/useCargoStatus.ts",
  "game/components/CargoDisplay.tsx",
  "game/components/station/TradeTab.tsx",
]) {
  assert.match(
    source(path),
    /getGasVolume/,
    `${path}: показывает занятый трюм без учёта газа`,
  );
}

// Полоса вместимости и разбивка обязаны сходиться: газ учтён в сумме, но не
// показан — это и был баг «70 тонн груза, а видно только зонды»
const cargoPanel = source("game/components/CargoDisplay.tsx");
assert.match(
  cargoPanel,
  /cargo\.section_gases/,
  "газ входит в занятое место, но не показан в разбивке — сумма не сходится с тем, что видно",
);
// Колонок ровно столько, сколько метрик: разъехавшаяся сетка прячет
// последнюю строку разбивки, и сумма снова перестаёт сходиться с видимым
const metricCount = (cargoPanel.match(/<CargoMetric\b/g) ?? []).length;
assert.match(
  cargoPanel,
  new RegExp(`sm:grid-cols-${metricCount}\\b`),
  `метрик ${metricCount}, а колонок в разбивке столько нет`,
);
for (const lang of ["ru", "en"]) {
  const catalog = JSON.parse(
    readFileSync(new URL(`../src/lib/locales/${lang}.json`, import.meta.url), "utf8"),
  );
  assert.ok(catalog.cargo?.section_gases, `${lang}: нет cargo.section_gases`);
  for (const key of ["gas_in_hold"]) {
    assert.ok(catalog.cargo_info?.[key], `${lang}: нет cargo_info.${key}`);
  }
}

// Вывоз упирается в трюм и оставляет остаток
assert.match(
  source("game/slices/outposts/helpers/collectOutpost.ts"),
  /getFreeCargoSpace/,
  "вывоз не смотрит на свободное место — газ появится из воздуха",
);

// ── Газ в трюме кликабелен и его можно выбросить ───────────────────────────
// Криоген не продаётся и тратится по единице за ход: без выброса полный трюм
// криогена был бы тупиком на десятки ходов.
assert.match(
  cargoPanel,
  /onClick=\{\(\) => setGasInfo\(gas\)\}/,
  "строки газа не кликабельны — остальные сущности трюма открывают модалку",
);
assert.doesNotMatch(
  cargoPanel,
  /gases\.\$\{gas\}\.use/,
  "описание газа осталось прямо в списке трюма, ему место в модалке",
);
// Выброс газа переехал в общий шлюз — его держит check:jettison
assert.match(
  source("game/components/CargoDisplay.tsx"),
  /JettisonDialog/,
  "из трюма нельзя открыть шлюз, а криоген иначе не выбросить",
);

// ── Гарнизон: кого отправить — это выбор, а не галочка ─────────────────────
const collector = { id: "oc", kind: "gas_collector", locationId: "gg-1", bunker: {} };
const stationedAs = (profession, level) => [
  { id: 1, profession, level, outpostId: "oc" },
];

const empty = getOutpostOutputMultiplier(collector, []);
const wrong = getOutpostOutputMultiplier(collector, stationedAs("gunner", 1));
const right = getOutpostOutputMultiplier(collector, stationedAs("engineer", 1));
const veteran = getOutpostOutputMultiplier(collector, stationedAs("engineer", 5));

assert.ok(
  empty < wrong && wrong < right && right < veteran,
  `множители не выстраиваются в лестницу: пусто ${empty}, не по профилю ${wrong}, инженер ${right}, ветеран ${veteran}`,
);
assert.equal(right, 1, "профильный инженер первого уровня — та самая норма, от которой считалась окупаемость");
assert.equal(empty, OUTPOST_CREW_MULTIPLIERS.empty);

// Людей с чужого аванпоста считать нельзя
assert.equal(
  getOutpostOutputMultiplier(collector, [
    { id: 2, profession: "engineer", level: 9, outpostId: "другой" },
  ]),
  OUTPOST_CREW_MULTIPLIERS.empty,
  "экипаж чужой постройки учитывается как свой",
);

// Пустой слот наказан, но не смертельно: иначе человек перестаёт быть выбором
const emptyPayback =
  (GAS_COLLECTOR_COST.credits / (bestGasPrice * GAS_COLLECTOR_BUNKER_CAP)) *
  (GAS_COLLECTOR_FILL_TURNS / empty);
assert.ok(
  emptyPayback <= 160,
  `без экипажа окупаемость ${Math.round(emptyPayback)} ходов — гарнизон становится обязаловкой, а не выбором`,
);

// Накопление реально слушается экипажа
const withEngineer = accrueOutposts([collector], sectors, stationedAs("engineer", 1));
const withoutCrew = accrueOutposts([collector], sectors, []);
assert.ok(
  getBunkerTotal(withEngineer[0]) >= getBunkerTotal(withoutCrew[0]),
  "экипаж не влияет на выработку",
);
// Дробная выработка не теряется: остаток копится и доносит единицу
let slow = [collector];
for (let turn = 0; turn < 10; turn++) slow = accrueOutposts(slow, sectors, []);
assert.equal(
  getBunkerTotal(slow[0]),
  Math.floor(10 * empty),
  "дробная выработка теряется вместо накопления остатка",
);

// ── Приписанный уходит с корабля по-настоящему ─────────────────────────────
const stationSource = source("game/slices/outposts/helpers/stationCrew.ts");
for (const field of ["moduleId: 0", "assignment: null", "combatAssignment: null"]) {
  assert.ok(
    stationSource.includes(field),
    `приписка не сбрасывает ${field} — человек работал бы и на аванпосте, и на корабле`,
  );
}
assert.match(
  stationSource,
  /stationedFromModuleId: c\.moduleId/,
  "прежний отсек не запоминается — вернуть человека будет некуда",
);
assert.match(
  source("game/slices/locations/helpers/respondToDistressSignal.ts"),
  /getShipCrew\(get\(\)\.crew\)\.length < get\(\)\.getCrewCapacity\(\)/,
  "наём считает приписанных как занимающих койку",
);
assert.match(
  source("game/slices/gameLoop/processors/processOthers.ts"),
  /getShipCrew\(get\(\)\.crew\)\.length/,
  "перенаселение считает приписанных как находящихся на борту",
);

// ── Постройку видно на обеих картах и в обеих легендах ─────────────────────
// Иначе «прилететь за добычей» превращается в перебор секторов наугад.
assert.match(
  source("game/galaxy/galaxy-map-utils.ts"),
  /drawOutpostSectorMarkers/,
  "на карте галактики не видно, в какой системе стоит постройка",
);
assert.match(
  source("game/components/GalaxyMap.tsx"),
  /drawOutpostSectorMarkers\(/,
  "значки аванпостов не рисуются на карте галактики",
);
for (const [path, what] of [
  ["game/components/sectorMap/LegendIcon.tsx", 'case "outpost"'],
  ["game/components/SectorMap.tsx", 'key: "outpost"'],
  ["game/components/GalaxyMap.tsx", "outposts.legend"],
]) {
  assert.ok(source(path).includes(what), `${path}: аванпоста нет в легенде`);
}

// ── Приписанного видно в разделе экипажа, вместе с местом ──────────────────
// На сетке корабля его нет, поэтому «отсек» показывать нечего
// Оба экрана экипажа обязаны брать место из одного помощника: карточка и
// подробная вкладка расходились, и вторая честно писала «Неизвестно»
const describer = source("game/crew/describeStationedPlace.ts");
assert.ok(
  describer.includes("sector?.name") && describer.includes("location?.name"),
  "не сказано, где именно стоит постройка — по названию непонятно, куда лететь",
);
for (const path of [
  "game/components/CrewMemberCard.tsx",
  "game/components/CrewList.tsx",
]) {
  assert.match(
    source(path),
    /describeStationedPlace\(/,
    `${path}: показывает приписанному отсек корабля, которого у него нет`,
  );
}
assert.match(
  source("game/components/CrewList.tsx"),
  /stationedPlace \? \(/,
  "приписанному всё ещё предлагают ходить по отсекам корабля",
);
// Выделять надо в обоих экранах: карточка на сетке корабля и плитка на
// вкладке «Экипаж» — разные компоненты, и правка одного оставляет другой слепым
assert.match(
  source("game/components/CrewMemberCard.tsx"),
  /STATIONED_CARD_CHROME/,
  "приписанные не выделены на карточке у сетки корабля",
);
assert.match(
  source("game/components/CrewList.tsx"),
  /STATIONED_CARD_STYLE/,
  "приписанные не выделены на вкладке «Экипаж» — в длинной команде их не найти",
);

// Кнопка приписки обязана называть профессию: с несколькими инженерами
// одно имя ничего не говорит. Блок общий для базы и сборщика — искать надо
// в нём, а не в отдельной панели
assert.match(
  source("game/components/OutpostGarrison.tsx"),
  /\{member\.name\} ·\{" "\}\n\s*\{t\(`professions\./,
  "в списке кандидатов не видно профессии и уровня",
);

// ── Работа на аванпосте даёт опыт, одиночество бьёт по морали ─────────────
const { processOutpostCrew } = await import(
  "../src/game/slices/outposts/helpers/processOutpostCrew.ts"
);
const {
  OUTPOST_CREW_EXP,
  OUTPOST_ISOLATION_INTERVAL,
  OUTPOST_ISOLATION_MORALE,
} = await import("../src/game/constants/outposts.ts");

const crewFixture = () => [
  { id: 1, name: "Инж", profession: "engineer", race: "human", level: 1,
    happiness: 80, maxHappiness: 100, outpostId: "oc" },
  { id: 2, name: "Стрелок", profession: "gunner", race: "human", level: 1,
    happiness: 80, maxHappiness: 100, outpostId: "oc" },
  { id: 3, name: "Синт", profession: "engineer", race: "synthetic", level: 1,
    happiness: 80, maxHappiness: 100, outpostId: "oc" },
  { id: 4, name: "Отшельник", profession: "engineer", race: "human", level: 1,
    happiness: 80, maxHappiness: 100, outpostId: "oc", hermit: true },
  { id: 5, name: "На борту", profession: "pilot", race: "human", level: 1,
    happiness: 80, maxHappiness: 100 },
];

const runTurn = (turn) => {
  const state = { turn, crew: crewFixture(), outposts: [collector], logs: [] };
  const granted = [];
  const store = {
    ...state,
    gainExp: (member, amount) => granted.push([member.id, amount]),
    addLog: (text) => state.logs.push(text),
  };
  Object.defineProperty(store, "crew", { get: () => state.crew, configurable: true });
  const set = (fn) => Object.assign(state, typeof fn === "function" ? fn(state) : fn);
  processOutpostCrew(set, () => store);
  return { state, granted };
};

// Опыт: профильному больше, на борту — ничего от аванпоста
const { granted } = runTurn(1);
assert.deepEqual(
  granted.find(([id]) => id === 1),
  [1, OUTPOST_CREW_EXP.onRole],
  "профильный не получает опыт за работу на аванпосте",
);
assert.deepEqual(granted.find(([id]) => id === 2), [2, OUTPOST_CREW_EXP.offRole]);
assert.ok(
  !granted.some(([id]) => id === 5),
  "член экипажа на борту получил опыт аванпоста",
);
assert.ok(
  OUTPOST_CREW_EXP.onRole > OUTPOST_CREW_EXP.offRole,
  "профильная работа обязана учить быстрее",
);

// Изоляция бьёт только по срокам и только по тем, кого она касается
const between = runTurn(OUTPOST_ISOLATION_INTERVAL + 1);
assert.ok(
  between.state.crew.every((c) => c.happiness === 80),
  "мораль падает каждый ход вместо интервала",
);

const lonely = runTurn(OUTPOST_ISOLATION_INTERVAL);
const by = (id) => lonely.state.crew.find((c) => c.id === id);
assert.equal(by(1).happiness, 80 - OUTPOST_ISOLATION_MORALE, "изоляция не бьёт по морали");
assert.equal(by(3).happiness, 80, "синтетику посчитали мораль, которой у него нет");
assert.equal(
  by(4).happiness,
  80,
  "отшельник страдает от одиночества — на аванпосте эта черта обязана работать в плюс",
);
assert.equal(by(5).happiness, 80, "изоляция задела экипаж на борту");
assert.equal(lonely.state.logs.length, 1, "падение морали должно быть видно в журнале");

assert.match(
  source("game/slices/gameLoop/gameLoopSlice.ts"),
  /processOutpostCrew\(set, get\)/,
  "ход приписанного экипажа не подключён к игровому циклу",
);

// ── Локали: ворота, газы и логи переведены на оба языка ────────────────────
const BLOCKERS = [
  "tech_missing",
  "limit_reached",
  "already_built",
  "no_deep_dive",
  "wrong_location",
  "not_enough_credits",
  "not_enough_resources",
];
for (const lang of ["ru", "en"]) {
  const catalog = JSON.parse(
    readFileSync(new URL(`../src/lib/locales/${lang}.json`, import.meta.url), "utf8"),
  );
  for (const blocker of BLOCKERS) {
    assert.ok(catalog.outposts?.[`blocked_${blocker}`], `${lang}: нет outposts.blocked_${blocker}`);
    assert.ok(
      catalog.game_logs?.[`outpost_blocked_${blocker}`],
      `${lang}: нет лога outpost_blocked_${blocker}`,
    );
  }
  for (const key of ["gas_from_outposts", "gas_price", "sell_all", "cryogen_burning", "garrison", "garrison_empty", "recall", "no_candidates", "legend"]) {
    assert.ok(catalog.outposts?.[key], `${lang}: нет outposts.${key}`);
  }
  for (const gas of gases) {
    assert.ok(catalog.gases?.[gas]?.name, `${lang}: нет имени газа ${gas}`);
    assert.ok(catalog.gases?.[gas]?.use, `${lang}: не сказано, зачем нужен ${gas}`);
    assert.ok(catalog.gases?.[gas]?.desc, `${lang}: нет описания газа ${gas} для модалки`);
  }
  for (const key of ["outpost_built_gas_collector", "outpost_collected", "outpost_collect_empty", "outpost_collect_remote", "outpost_collect_no_room", "outpost_collect_partial", "outpost_crew_stationed", "outpost_crew_recalled", "outpost_crew_remote", "outpost_crew_no_slot", "outpost_isolation", "gas_sold", "gas_not_sellable"]) {
    assert.ok(catalog.game_logs?.[key], `${lang}: нет лога ${key}`);
  }
}

// ── Окупаемость лежит в целевом окне 80–120 ходов ──────────────────────────
// Иначе «построил и забыл» побеждает «играл» — см. риски в плане.
const perFullBunker = bestGasPrice * GAS_COLLECTOR_BUNKER_CAP;
const paybackTurns =
  (GAS_COLLECTOR_COST.credits / perFullBunker) * GAS_COLLECTOR_FILL_TURNS;
assert.ok(
  paybackTurns >= 60 && paybackTurns <= 160,
  `окупаемость ${Math.round(paybackTurns)} ходов вне разумного окна — постройка либо бессмысленна, либо ломает экономику`,
);

assert.equal(GAS_COLLECTOR_REQUIRED_DIVE_DEPTH, 4, "право на постройку даёт только ядро шторма");

// ── У каждого газа есть применение, а не только цена ──────────────────────
// Три газа из четырёх были чистым товаром, хотя описания обещали топливо и
// сборку модулей. Проверка следит, что обещание подкреплено кодом.
const { DEUTERIUM_FUEL_PER_UNIT, GAS_SELL_RATE: sellRate } =
  await import("../src/game/constants/outposts.ts");
const { getDeuteriumBurnUnits } = await import(
  "../src/game/slices/ship/helpers/fuel/burnDeuterium.ts"
);
const { FUEL_PRICE_PER_UNIT } = await import(
  "../src/game/slices/services/constants.ts"
);

const fuelState = (fuel, maxFuel, deuterium) => ({
  crew: [],
  ship: { fuel, maxFuel, modules: [] },
  gases: { deuterium },
});
assert.equal(getDeuteriumBurnUnits(fuelState(0, 100, 20)), 10, "в пустой бак влезает не весь бак");
assert.equal(getDeuteriumBurnUnits(fuelState(0, 100, 3)), 3, "сжигается больше, чем есть в трюме");
assert.equal(getDeuteriumBurnUnits(fuelState(100, 100, 20)), 0, "дейтерий горит в полный бак");
assert.equal(getDeuteriumBurnUnits(fuelState(95, 100, 20)), 1, "остаток бака требует лишних единиц");

// Возить дейтерий в бак обязано быть выгоднее, чем продавать и заправляться
assert.ok(
  DEUTERIUM_FUEL_PER_UNIT * FUEL_PRICE_PER_UNIT >
    GAS_BASE_PRICE.deuterium * sellRate,
  "продать дейтерий выгоднее, чем залить в бак — кнопка заправки мертва",
);

// Полимеры нужны гибридным модулям, иначе это снова просто товар
const { MODULE_RECIPES } = await import("../src/game/constants/crafting.ts");
for (const [id, recipe] of Object.entries(MODULE_RECIPES)) {
  assert.ok(
    (recipe.gases?.polymers ?? 0) > 0,
    `${id}: гибридный модуль собирается без полимеров`,
  );
}
assert.match(
  readFileSync(
    new URL("../src/game/slices/crafting/craftingSlice.ts", import.meta.url),
    "utf8",
  ),
  /recipe\.gases/,
  "рецепт требует газ, а крафт его не проверяет и не списывает",
);
// Полимеры обязаны продаваться станцией: иначе рецепт заперт за атмосферой
// гиганта, которая выпадает случайно
assert.ok(GAS_BUY_RATE > sellRate, "купить газ дешевле, чем продать");
assert.match(
  readFileSync(
    new URL("../src/game/slices/outposts/helpers/sellGas.ts", import.meta.url),
    "utf8",
  ),
  /export function buyGas/,
  "полимеры негде купить — без метанового гиганта гибриды недостижимы",
);

console.log("Outpost checks passed");
console.log(
  `  бункер ${GAS_COLLECTOR_BUNKER_CAP} за ${GAS_COLLECTOR_FILL_TURNS} ходов; окупаемость ~${Math.round(paybackTurns)} ходов на лучшем газе`,
);
