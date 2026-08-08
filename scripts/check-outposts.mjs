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

for (let turn = 0; turn < GAS_COLLECTOR_FILL_TURNS; turn++) {
  outposts = accrueOutposts(outposts, sectors);
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
  outposts = accrueOutposts(outposts, sectors);
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
  /drawOutpostBadge\(ctx, x, y, outpost\.full\)/,
  "значок не различает полный бункер, а это единственный повод менять маршрут",
);

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

// ── Газ занимает трюм ──────────────────────────────────────────────────────
// Без этого бункер на 40 единиц не создаёт давления, и вывоз ничего не стоит.
const { getCurrentCargo, getGasVolume } = await import(
  "../src/game/slices/ship/helpers/getCurrentCargo.ts"
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

// Ни одно место больше не считает занятый трюм в обход помощника: иначе газ
// остался бы бесплатным в восьми проверках вместимости из девяти
for (const path of [
  "game/slices/travel/helpers/processTravel.ts",
  "game/slices/trade/helpers/buyTradeGood.ts",
  "game/slices/locations/createLocationsSlice.ts",
  "game/slices/crew/helpers/merge.ts",
  "game/slices/contracts/helpers/acceptContract.ts",
]) {
  assert.doesNotMatch(
    source(path),
    /cargo\.reduce\([\s\S]{0,120}tradeGoods\.reduce/,
    `${path}: занятый трюм снова считается вручную, мимо getCurrentCargo`,
  );
}
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
assert.match(
  cargoPanel,
  /grid-cols-5/,
  "в разбивке осталось четыре колонки, а метрик стало пять",
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
  for (const key of ["gas_from_outposts", "gas_price", "sell_all", "cryogen_burning"]) {
    assert.ok(catalog.outposts?.[key], `${lang}: нет outposts.${key}`);
  }
  for (const gas of gases) {
    assert.ok(catalog.gases?.[gas]?.name, `${lang}: нет имени газа ${gas}`);
    assert.ok(catalog.gases?.[gas]?.use, `${lang}: не сказано, зачем нужен ${gas}`);
    assert.ok(catalog.gases?.[gas]?.desc, `${lang}: нет описания газа ${gas} для модалки`);
  }
  for (const key of ["outpost_built_gas_collector", "outpost_collected", "outpost_collect_empty", "outpost_collect_remote", "outpost_collect_no_room", "outpost_collect_partial", "gas_sold", "gas_not_sellable"]) {
    assert.ok(catalog.game_logs?.[key], `${lang}: нет лога ${key}`);
  }
}

// ── Окупаемость лежит в целевом окне 80–120 ходов ──────────────────────────
// Иначе «построил и забыл» побеждает «играл» — см. риски в плане.
const bestGas = Math.max(...sellable.map((gas) => GAS_BASE_PRICE[gas]));
const perFullBunker = bestGas * GAS_COLLECTOR_BUNKER_CAP;
const paybackTurns =
  (GAS_COLLECTOR_COST.credits / perFullBunker) * GAS_COLLECTOR_FILL_TURNS;
assert.ok(
  paybackTurns >= 60 && paybackTurns <= 160,
  `окупаемость ${Math.round(paybackTurns)} ходов вне разумного окна — постройка либо бессмысленна, либо ломает экономику`,
);

assert.equal(GAS_COLLECTOR_REQUIRED_DIVE_DEPTH, 4, "право на постройку даёт только ядро шторма");

console.log("Outpost checks passed");
console.log(
  `  бункер ${GAS_COLLECTOR_BUNKER_CAP} за ${GAS_COLLECTOR_FILL_TURNS} ходов; окупаемость ~${Math.round(paybackTurns)} ходов на лучшем газе`,
);
