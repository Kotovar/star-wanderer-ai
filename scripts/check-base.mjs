import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
// Dev-шаблоны существуют только в development, а SHIP_TEMPLATES вычисляется
// один раз при загрузке модуля — переменную надо выставить до любых импортов
process.env.NODE_ENV = "development";

import "./register-ts-loader.mjs";

/**
 * Главная база: право на закладку, слоты, модули и вывоз.
 *
 * Главное, что здесь проверяется, — что слотов остаётся меньше, чем модулей.
 * Как только их хватит на всё, выбор «что поставить» исчезнет, а вместе с ним
 * и смысл всей системы: она затевалась против чек-листов.
 */

const {
  BASE_BUNKER_CAP,
  BASE_COST,
  BASE_MAX_LEVEL,
  BASE_MODULES,
  BASE_SLOTS_BY_LEVEL,
  BASE_UPGRADE_COST,
  getBaseCrewSlots,
} = await import("../src/game/constants/baseModules.ts");
const { getBaseBlocker } = await import(
  "../src/game/slices/outposts/helpers/canBuildBase.ts"
);
const { getModuleBlocker } = await import(
  "../src/game/slices/outposts/helpers/buildBase.ts"
);
const { accrueOutposts } = await import(
  "../src/game/slices/outposts/helpers/accrueOutposts.ts"
);
const { getHaulKind, takesCargoRoom } = await import(
  "../src/game/slices/outposts/helpers/routeHaul.ts"
);
const { OUTPOST_TECH_ID } = await import("../src/game/constants/outposts.ts");
const { PLANET_FEATURES, getPlanetFeatures } = await import(
  "../src/game/planets/features.ts"
);
const { RESEARCH_RESOURCES } = await import(
  "../src/game/constants/research/resources.ts"
);

const source = (path) =>
  readFileSync(new URL(`../src/${path}`, import.meta.url), "utf8");

// ── Слотов обязано быть меньше, чем модулей ────────────────────────────────
const moduleIds = Object.keys(BASE_MODULES);
const maxSlots = BASE_SLOTS_BY_LEVEL[BASE_MAX_LEVEL];
assert.ok(
  maxSlots > 0 && maxSlots >= 2,
  "на максимальном уровне слотов должно быть достаточно для осмысленной базы",
);
assert.deepEqual(
  [...BASE_SLOTS_BY_LEVEL].slice(1),
  [...BASE_SLOTS_BY_LEVEL].slice(1).sort((a, b) => a - b),
  "слоты не растут с уровнем",
);
assert.equal(BASE_SLOTS_BY_LEVEL.length - 1, BASE_MAX_LEVEL);
assert.equal(
  BASE_UPGRADE_COST.length,
  BASE_MAX_LEVEL,
  "нет стоимости апгрейда на каждый уровень, кроме последнего",
);
for (let level = 1; level < BASE_MAX_LEVEL; level++) {
  assert.ok(
    BASE_UPGRADE_COST[level].credits > (BASE_UPGRADE_COST[level - 1]?.credits ?? 0),
    `апгрейд на уровень ${level + 1} не дороже предыдущего — расширяться должно быть всё труднее`,
  );
}
assert.ok(
  getBaseCrewSlots(BASE_MAX_LEVEL) >= 1,
  "на максимальном уровне у базы нет мест гарнизона",
);

// ── Модули: у каждого своя добыча, и она попадает в известное место ────────
for (const [id, def] of Object.entries(BASE_MODULES)) {
  assert.equal(def.id, id, `${id}: id внутри определения разошёлся с ключом`);
  assert.ok(def.role, `${id}: не сказано, какая профессия его усиливает`);
  assert.ok(def.cost.credits > 0, `${id}: бесплатный модуль`);
  // Модуль либо добывает, либо оказывает услугу. Пустой слот-пожиратель,
  // который не делает ни того ни другого, — просто потерянный слот
  assert.ok(
    Object.keys(def.output).length > 0 || def.service,
    `${id}: модуль не добывает и не оказывает услуги — слот потрачен впустую`,
  );
  assert.ok(
    !(Object.keys(def.output).length > 0 && def.service),
    `${id}: модуль и добывает, и оказывает услугу — слот перестаёт быть выбором`,
  );
  for (const resource of Object.keys(def.output)) {
    assert.ok(
      getHaulKind(resource),
      `${id}: добывает «${resource}», который некуда вывезти`,
    );
  }
  for (const feature of [def.requiresFeature, def.boostedBy].filter(Boolean)) {
    assert.ok(
      PLANET_FEATURES[feature],
      `${id}: ссылается на несуществующую черту ${feature}`,
    );
  }
}

// Научные образцы трюма не занимают — так устроены все прочие источники
assert.equal(takesCargoRoom("ancient_data"), false);
assert.equal(takesCargoRoom("minerals"), true);
assert.equal(takesCargoRoom("deuterium"), true);
// rare_minerals есть и среди товаров, и среди научных ресурсов: должен ехать
// в трюм, как и из бура
assert.equal(getHaulKind("rare_minerals"), "good");

// ── Право на закладку ──────────────────────────────────────────────────────
const planet = (over = {}) => ({
  id: "p-1",
  type: "planet",
  isEmpty: true,
  explored: true,
  ...over,
});
const rich = {
  credits: 99999,
  outposts: [],
  research: {
    researchedTechs: [OUTPOST_TECH_ID],
    resources: Object.fromEntries(
      Object.keys(RESEARCH_RESOURCES).map((key) => [key, 99]),
    ),
  },
};

assert.equal(getBaseBlocker(rich, planet()), null);
assert.equal(
  getBaseBlocker(rich, planet({ explored: false })),
  "not_explored",
  "базу можно заложить на неисследованной планете — тогда изыскания снова ни при чём",
);
assert.equal(getBaseBlocker(rich, planet({ isEmpty: false })), "wrong_location");
assert.equal(getBaseBlocker(rich, planet({ type: "gas_giant" })), "wrong_location");
assert.equal(
  getBaseBlocker(
    { ...rich, research: { ...rich.research, researchedTechs: [] } },
    planet(),
  ),
  "tech_missing",
);
assert.equal(
  getBaseBlocker(
    { ...rich, outposts: [{ id: "b", kind: "base", locationId: "другая", bunker: {} }] },
    planet(),
  ),
  "limit_reached",
  "лимит в одну базу не соблюдается — она перестаёт быть «вашим местом»",
);
assert.equal(
  getBaseBlocker({ ...rich, credits: 1 }, planet()),
  "not_enough_credits",
);

// ── Модули в слотах ────────────────────────────────────────────────────────
// Планета, у которой нет ледяных шапок — крекеру там нечего перерабатывать
const withoutIce = (() => {
  for (let i = 0; i < 5000; i++) {
    const id = `base-probe-${i}`;
    if (!getPlanetFeatures(id).includes("ice_caps")) return id;
  }
  throw new Error("не нашёл планету без ледяных шапок");
})();
const withIce = (() => {
  for (let i = 0; i < 5000; i++) {
    const id = `base-probe-${i}`;
    if (getPlanetFeatures(id).includes("ice_caps")) return id;
  }
  throw new Error("не нашёл планету с ледяными шапками");
})();

const baseAt = (locationId, over = {}) => ({
  id: "b1",
  kind: "base",
  locationId,
  sectorId: 1,
  bunker: {},
  level: 1,
  modules: [],
  ...over,
});

assert.equal(getModuleBlocker(rich, baseAt(withIce), "cryo_cracker"), null);
assert.equal(
  getModuleBlocker(rich, baseAt(withoutIce), "cryo_cracker"),
  "feature_missing",
  "крекер ставится там, где нет льда — черта планеты перестала что-то решать",
);
assert.equal(
  getModuleBlocker(rich, baseAt(withIce, { modules: ["drill_shaft"] }), "drill_shaft"),
  "already_built",
);
assert.equal(
  getModuleBlocker(
    rich,
    baseAt(withIce, { modules: ["drill_shaft", "field_lab"] }),
    "cryo_cracker",
  ),
  "no_slot",
  "модули влезают сверх слотов — сетка перестала ограничивать",
);
assert.equal(
  getModuleBlocker({ ...rich, credits: 1 }, baseAt(withIce), "drill_shaft"),
  "not_enough_credits",
);

// ── База добывает и упирается в потолок бункера ────────────────────────────
const sectors = [{ id: 1, locations: [{ id: withIce }] }];
const engineer = [{ id: 1, profession: "engineer", level: 1, outpostId: "b1" }];

let bases = [baseAt(withIce, { modules: ["drill_shaft"] })];
for (let turn = 0; turn < 10; turn++) {
  bases = accrueOutposts(bases, sectors, engineer);
}
assert.ok(
  (bases[0].bunker.minerals ?? 0) > 0,
  "база с буровой ничего не добыла",
);

// Пустая база не копит: слоты — это и есть то, что делает базу базой
let idle = [baseAt(withIce)];
for (let turn = 0; turn < 10; turn++) idle = accrueOutposts(idle, sectors, engineer);
assert.deepEqual(idle[0].bunker, {}, "база без модулей что-то добывает");

// Потолок держит
let full = [baseAt(withIce, { modules: ["drill_shaft"] })];
for (let turn = 0; turn < 500; turn++) full = accrueOutposts(full, sectors, engineer);
for (const [resource, amount] of Object.entries(full[0].bunker)) {
  assert.ok(
    amount <= BASE_BUNKER_CAP,
    `${resource}: бункер переполнен (${amount} при потолке ${BASE_BUNKER_CAP})`,
  );
}

// Черта планеты удваивает выход — ради этого «где строить» и остаётся решением
const richDeposits = (() => {
  for (let i = 0; i < 5000; i++) {
    const id = `boost-probe-${i}`;
    if (getPlanetFeatures(id).includes("rich_deposits")) return id;
  }
  throw new Error("не нашёл планету с богатыми залежами");
})();
const plainSoil = (() => {
  for (let i = 0; i < 5000; i++) {
    const id = `boost-probe-${i}`;
    if (!getPlanetFeatures(id).includes("rich_deposits")) return id;
  }
  throw new Error("не нашёл планету без богатых залежей");
})();
const mineFor = (locationId) => {
  let outposts = [baseAt(locationId, { modules: ["drill_shaft"] })];
  const secs = [{ id: 1, locations: [{ id: locationId }] }];
  for (let turn = 0; turn < 10; turn++) {
    outposts = accrueOutposts(outposts, secs, [
      { id: 1, profession: "engineer", level: 1, outpostId: "b1" },
    ]);
  }
  return outposts[0].bunker.minerals ?? 0;
};
assert.ok(
  mineFor(richDeposits) > mineFor(plainSoil),
  "богатые залежи не усиливают буровую — черта планеты ни на что не влияет",
);

// ── Служебные модули ───────────────────────────────────────────────────────
const { hasBaseService, getRelayScanBonus, getBarracksSlots } = await import(
  "../src/game/slices/outposts/helpers/baseServices.ts"
);
const { getCrewSlots } = await import(
  "../src/game/slices/outposts/helpers/outpostCrew.ts"
);
const { BASE_SERVICE_VALUES } = await import(
  "../src/game/constants/baseModules.ts"
);

const services = Object.values(BASE_MODULES)
  .map((def) => def.service)
  .filter(Boolean);
assert.equal(
  new Set(services).size,
  services.length,
  "две постройки дают одну и ту же услугу — один из слотов становится лишним",
);

const withRelay = baseAt(withIce, { modules: ["relay"] });
assert.equal(hasBaseService(withRelay, "relay"), true);
assert.equal(hasBaseService(baseAt(withIce), "relay"), false);
assert.equal(
  getRelayScanBonus([withRelay]),
  BASE_SERVICE_VALUES.relayScanRange,
  "ретранслятор не расширяет дальность сканирования",
);
assert.equal(
  getRelayScanBonus([]),
  0,
  "дальность растёт без построек — бонус берётся из воздуха",
);

// Ретранслятор обязан работать откуда угодно: в этом весь его смысл
assert.match(
  source("game/slices/scanner/helpers/getEffectiveScanRange.ts"),
  /getRelayScanBonus\(state\.outposts/,
  "ретранслятор не подключён к дальности сканирования",
);

// Казарма расширяет гарнизон, а не заменяет уровень
const plainBase = baseAt(withIce, { level: 2 });
const barracksBase = baseAt(withIce, { level: 2, modules: ["barracks"] });
assert.equal(getBarracksSlots(plainBase), 0);
assert.equal(
  getCrewSlots(barracksBase) - getCrewSlots(plainBase),
  BASE_SERVICE_VALUES.garrisonSlots,
  "казарма не добавляет мест гарнизона",
);

// Услуги работают только на месте — иначе это кнопки из любой точки галактики
for (const path of [
  "game/slices/outposts/helpers/useBaseServices.ts",
  "game/slices/outposts/helpers/storeAtBase.ts",
]) {
  assert.match(
    source(path),
    /currentLocation\?\.id !== outpost\.locationId/,
    `${path}: услугой можно пользоваться, не прилетая на базу`,
  );
}

// Служебные модули занимают те же слоты, что и добывающие — ради этого
// выбор и остаётся выбором
assert.ok(
  moduleIds.length > maxSlots,
  `модулей ${moduleIds.length} при ${maxSlots} слотах — на максимуме влезает всё, выбор исчез`,
);

// ── Склад принимает то, ради чего он и нужен ──────────────────────────────
// Груз задания и запасной модуль продать нельзя, а трюм они занимают. Пока
// склад брал только товары и газ, он принимал ровно то, что и так продаётся.
const { getStorageFree, getStorageUsed } = await import(
  "../src/game/slices/outposts/helpers/baseStorage.ts"
);

const stocked = baseAt(withIce, {
  modules: ["warehouse"],
  bunker: { minerals: 10 },
  storedCargo: [{ item: "relic_case", quantity: 4, contractId: "c1" }],
  storedGoods: { water: 6 },
});
assert.equal(
  getStorageUsed(stocked),
  20,
  "объём склада считается не по всему, что на нём лежит",
);
assert.equal(
  getStorageFree(stocked),
  BASE_SERVICE_VALUES.storageCapacity - 20,
);

// Сложенное на хранение не должно уезжать обратно кнопкой «забрать добычу»:
// вывоз гребёт бункер целиком, поэтому склад товаров живёт отдельно
assert.match(
  source("game/slices/outposts/helpers/storeAtBase.ts"),
  /storedGoods:/,
  "разгрузка трюма кладёт товар в бункер — вывоз добычи вернёт его в трюм",
);
assert.doesNotMatch(
  source("game/slices/outposts/helpers/collectOutpost.ts"),
  /storedGoods/,
  "вывоз добычи забирает и то, что игрок оставил на хранение",
);

const storage = source("game/slices/outposts/helpers/baseStorage.ts");
assert.match(
  storage,
  /state\.ship\.cargo\[cargoIndex\]/,
  "склад не принимает предметы трюма — только то, что и так можно продать",
);
assert.match(
  storage,
  /getFreeCargoSpace/,
  "забирая со склада, игрок может превысить вместимость трюма",
);
for (const fn of ["storeCargoAtBase", "withdrawCargoFromBase"]) {
  assert.ok(storage.includes(fn), `нет ${fn}: склад работает в одну сторону`);
}
assert.match(
  storage,
  /a\.contractId === b\.contractId/,
  "ящики разных заданий слипнутся на складе в одну кучу",
);
assert.match(
  source("game/components/BaseSection.tsx"),
  /withdrawCargoFromBase\(/,
  "со склада нечем забрать положенное",
);

// ── Гарнизон базы должен быть достижим ─────────────────────────────────────
// Панель показывала «Гарнизон: 0/1» без единой кнопки: множитель базы
// навсегда оставался ×0.7, казарма давала места, которые нечем заполнить, а
// стрелок, снижающий риск захвата, был недостижим
const garrison = source("game/components/OutpostGarrison.tsx");
for (const fn of ["stationCrew(", "recallCrew("]) {
  assert.ok(garrison.includes(fn), `в гарнизоне нет ${fn}`);
}
for (const path of [
  "game/components/BaseSection.tsx",
  "game/components/GasCollectorSection.tsx",
]) {
  assert.match(
    source(path),
    /<OutpostGarrison/,
    `${path}: гарнизон не подключён — его слоты видно, но заполнить нечем`,
  );
}
assert.match(
  garrison,
  /getCrewSlots\(outpost\)/,
  "гарнизон считает слоты по-своему, а не общим помощником — у базы они зависят от уровня и казармы",
);

// ── Статус построек виден удалённо ─────────────────────────────────────────
// Строить только на месте, но знать, полон ли бункер, — откуда угодно:
// иначе маршрут не спланировать и приходится летать наугад
const status = source("game/components/OutpostStatusList.tsx");
for (const what of ["capturedAtTurn", "isBunkerFull", "getCrewSlots"]) {
  assert.ok(status.includes(what), `сводка не показывает ${what}`);
}
assert.match(
  source("game/components/CampaignProgressPanel.tsx"),
  /<OutpostStatusList/,
  "сводку по постройкам негде посмотреть",
);
// Сводка обязана оставаться только сводкой: строить и приписывать — на месте
for (const action of ["buildBase(", "installBaseModule(", "stationCrew("]) {
  assert.ok(
    !status.includes(action),
    `сводка позволяет ${action} издалека — возвращаться к постройке становится незачем`,
  );
}

// ── Верстак, казарма и медблок делают то, что обещают ─────────────────────
assert.equal(BASE_MODULES.workbench.service, "craft", "верстак не даёт крафта");
assert.match(
  source("game/components/BaseSection.tsx"),
  /<CraftingTab \/>/,
  "верстак заводит второй интерфейс крафта вместо вкладки станции — экраны разъедутся",
);

const hire = source("game/slices/outposts/helpers/hireAtBase.ts");
assert.match(
  hire,
  /hasBaseService\(outpost, "garrison"\)/,
  "поселенцев можно нанимать без казармы",
);

// ── Поселенца вербуют на планете, а не выращивают из воздуха ──────────────
// Мгновенный наём за фиксированную цену делал базу в глухом секторе таким же
// источником людей, как база у обитаемой планеты. Цена и дорога зависят от
// расстояния — это и есть скрытая цена глубокого места.
const { getSettlerOffer, getHireBlocker } = await import(
  "../src/game/slices/outposts/helpers/hireAtBase.ts"
);

const hireSectors = [
  { id: 1, tier: 1, mapAngle: 0, locations: [{ id: "p-home", type: "planet", name: "Дом", dominantRace: "human" }] },
  { id: 2, tier: 2, mapAngle: Math.PI, locations: [{ id: "p-far", type: "planet", name: "Даль", dominantRace: "zaari" }] },
  { id: 3, tier: 3, mapAngle: Math.PI, locations: [{ id: "p-empty", type: "planet", isEmpty: true }] },
];
const hireBase = (sectorId) => ({
  id: "hb",
  kind: "base",
  locationId: "p-empty",
  sectorId,
  bunker: {},
  level: 3,
  modules: ["barracks"],
});

const near = getSettlerOffer(hireBase(1), hireSectors);
const far = getSettlerOffer(hireBase(3), hireSectors);
assert.equal(near.hops, 0, "своя система считается далёкой");
assert.equal(near.cost, BASE_SERVICE_VALUES.settlerCost, "у соседа цена с надбавкой");
assert.ok(far.hops > 0 && far.cost > near.cost, "глухой сектор не дороже обитаемого");
assert.ok(far.turns > near.turns, "дорога из глухого сектора не дольше");
assert.equal(
  getSettlerOffer(hireBase(1), [{ id: 1, tier: 1, mapAngle: 0, locations: [] }]),
  null,
  "вербовка работает там, где вербовать некого",
);
assert.equal(near.race, "human", "раса планеты-донора теряется по дороге");

const hireState = { credits: 100000, crew: [], galaxy: { sectors: hireSectors } };
assert.equal(getHireBlocker(hireBase(1), hireState, near), null);
assert.equal(
  getHireBlocker(
    { ...hireBase(1), pendingSettler: { profession: "medic", arrivesAtTurn: 9 } },
    hireState,
    near,
  ),
  "in_transit",
  "второй поселенец заказывается, пока едет первый — дорога перестала быть кулдауном",
);
assert.equal(
  getHireBlocker(
    { ...hireBase(1), level: 1, modules: [] },
    { ...hireState, crew: [{ id: 1, outpostId: "hb" }] },
    near,
  ),
  "no_slot",
  "поселенец приезжает в переполненный гарнизон",
);
assert.equal(
  getHireBlocker(hireBase(1), { ...hireState, credits: 0 }, near),
  "not_enough_credits",
);
assert.match(
  hire,
  /pendingSettler/,
  "поселенец появляется мгновенно — дорога с планеты нигде не учитывается",
);

// Медблок — причина оставить человека надолго, а не просто койка
const crewTurn = source("game/slices/outposts/helpers/processOutpostCrew.ts");
assert.match(
  crewTurn,
  /hasBaseService\(outpost, "heal"\)/,
  "медблок не влияет на изоляцию — «оставить отдыхать» ничем не отличается от «забыть»",
);

// Турели встречают рейдеров огнём, а не только реже пускают
const raids = source("game/slices/outposts/helpers/outpostRaids.ts");
assert.match(
  raids,
  /turretThreatRelief/,
  "турели не ослабляют захватчиков — при штурме их как будто и не было",
);

// ── У каждого модуля и уровня есть картинка ───────────────────────────────
// Путь строится из id, а не хранится полем: забытое поле молча дало бы
// пустое место, а несуществующий файл проверка ловит здесь
const { existsSync } = await import("node:fs");
const {
  getBaseModuleImage,
  getBaseImage,
  GAS_COLLECTOR_IMAGE,
  BASE_CAPTURED_IMAGE,
} = await import("../src/game/constants/baseModules.ts");

const asset = (webPath) =>
  new URL(`../public${webPath}`, import.meta.url);

for (const id of moduleIds) {
  for (const path of [getBaseModuleImage(id), getBaseModuleImage(id).replace(".webp", ".avif")]) {
    assert.ok(existsSync(asset(path)), `${id}: нет файла ${path}`);
  }
}
for (let level = 1; level <= BASE_MAX_LEVEL; level++) {
  for (const path of [getBaseImage(level), getBaseImage(level).replace(".webp", ".avif")]) {
    assert.ok(existsSync(asset(path)), `уровень ${level}: нет файла ${path}`);
  }
}
assert.ok(existsSync(asset(GAS_COLLECTOR_IMAGE)));
// Захват — самое драматичное состояние системы, и оно не должно остаться
// единственным без картинки
for (const path of [
  BASE_CAPTURED_IMAGE,
  BASE_CAPTURED_IMAGE.replace(".webp", ".avif"),
  GAS_COLLECTOR_IMAGE.replace(".webp", ".avif"),
]) {
  assert.ok(existsSync(asset(path)), `нет файла ${path}`);
}
assert.match(
  source("game/components/BaseSection.tsx"),
  /BASE_CAPTURED_IMAGE/,
  "захваченная база показывается без иллюстрации, в отличие от всех прочих состояний",
);
// Уровень вне диапазона не должен уводить на несуществующий файл
assert.equal(getBaseImage(0), getBaseImage(1));
assert.equal(getBaseImage(99), getBaseImage(BASE_MAX_LEVEL));

// GameImage сначала пробует avif — без него каждая картинка стоила бы 404
assert.match(
  source("game/components/GameImage.tsx"),
  /replace\(".webp", ".avif"\)/,
  "GameImage перестал пробовать avif, а файлы лежат парами",
);
for (const path of [
  "game/components/BaseSection.tsx",
  "game/components/GasCollectorSection.tsx",
  "game/components/OutpostStatusList.tsx",
]) {
  assert.match(
    source(path),
    /<GameImage/,
    `${path}: картинки построек не показываются`,
  );
}

// ── Ни один материал не должен быть универсальным замком ──────────────────
// В первой версии обломки техники просили все десять модулей: стоило им
// кончиться на постройке базы, и вся система вставала разом
const askedBy = {};
for (const def of Object.values(BASE_MODULES)) {
  for (const resource of Object.keys(def.cost.resources)) {
    askedBy[resource] = (askedBy[resource] ?? 0) + 1;
  }
}
for (const [resource, count] of Object.entries(askedBy)) {
  assert.ok(
    count <= moduleIds.length * 0.6,
    `«${resource}» просят ${count} модулей из ${moduleIds.length} — исчерпав его, игрок теряет доступ ко всей базе сразу`,
  );
}
assert.ok(
  Object.keys(askedBy).length >= 4,
  "модули опираются на слишком узкий набор материалов",
);

// Базы и апгрейдов должно хватать так, чтобы после них оставалось на модули
const devTemplate = (await import("../src/game/constants/shipTemplates.ts")).SHIP_TEMPLATES.find(
  (tpl) => tpl.id === "dev_all_tech_explorer",
);
if (devTemplate?.researchResources) {
  const left = { ...devTemplate.researchResources };
  const spend = (res) => {
    for (const [k, v] of Object.entries(res ?? {})) left[k] = (left[k] ?? 0) - v;
  };
  spend(BASE_COST.resources);
  for (let level = 1; level < BASE_MAX_LEVEL; level++) {
    spend(BASE_UPGRADE_COST[level].resources);
  }
  const affordable = Object.values(BASE_MODULES).filter((def) =>
    Object.entries(def.cost.resources).every(
      ([resource, amount]) => (left[resource] ?? 0) >= amount,
    ),
  );
  assert.ok(
    affordable.length >= BASE_SLOTS_BY_LEVEL[BASE_MAX_LEVEL],
    `на dev-шаблоне после базы и всех апгрейдов доступно ${affordable.length} модулей при ${BASE_SLOTS_BY_LEVEL[BASE_MAX_LEVEL]} слотах — механику не посмотреть`,
  );
}

// Заблокированная кнопка обязана называть причину, а не молчать
assert.match(
  source("game/components/BaseSection.tsx"),
  /missing\.join\(", "\)/,
  "кнопка модуля не говорит, какого материала не хватает — блокировка читается как поломка",
);

// ── Стартовые постройки: только dev, и они реально встают ─────────────────
const { SHIP_TEMPLATES: TEMPLATES } = await import(
  "../src/game/constants/shipTemplates.ts"
);
const { seedStartingOutposts } = await import(
  "../src/game/slices/outposts/helpers/seedStartingOutposts.ts"
);

for (const tpl of TEMPLATES.filter((x) => x.startingOutposts)) {
  assert.ok(
    tpl.id.startsWith("dev_"),
    `${tpl.id} стартует с готовыми постройками, а это не dev-шаблон`,
  );
}

const fakeSectors = [
  {
    id: 1,
    tier: 2,
    locations: [
      { id: "p1", type: "planet", isEmpty: true },
      { id: "gg1", type: "gas_giant" },
      { id: "st1", type: "station" },
    ],
  },
];
const dev = TEMPLATES.find((x) => x.id === "dev_all_tech_explorer");
const seeded = seedStartingOutposts(fakeSectors, dev?.startingOutposts);
assert.equal(
  seeded.outposts.length,
  dev?.startingOutposts?.length ?? 0,
  "не все стартовые постройки нашли себе место",
);
const seededBase = seeded.outposts.find((o) => o.kind === "base");
assert.equal(seededBase?.locationId, "p1", "база встала не на пустую планету");
assert.equal(
  seeded.sectors[0].locations.find((l) => l.id === "p1")?.explored,
  true,
  "планета под готовой базой не помечена исследованной — панель базы не покажется",
);
assert.ok(
  seeded.outposts.some((o) => o.capturedAtTurn !== undefined),
  "нет захваченной постройки — штурм так и придётся ждать сотню ходов",
);
for (const outpost of seeded.outposts) {
  assert.ok(
    seeded.sectors[0].locations.some((l) => l.outpostId === outpost.id),
    `${outpost.id}: локация не помечена, значка на карте не будет`,
  );
}
// Нет подходящих локаций — старт не должен падать
assert.deepEqual(
  seedStartingOutposts([{ id: 1, tier: 1, locations: [] }], dev?.startingOutposts)
    .outposts,
  [],
);
assert.deepEqual(seedStartingOutposts(fakeSectors, undefined).outposts, []);

// ── Отказ обязан говорить про базу, а не про сборщики ─────────────────────
// Причины отказа общие, но лимит у них разный по смыслу: одна база против
// трёх сборщиков. Общий текст сообщал «больше газосборников не построить»
// на экране закладки базы и читался как сбой
assert.match(
  source("game/components/BaseSection.tsx"),
  /blocked_base_exists/,
  "отказ по лимиту базы берёт текст, написанный для газосборников",
);
for (const lang of ["ru", "en"]) {
  const catalog = JSON.parse(
    readFileSync(new URL(`../src/lib/locales/${lang}.json`, import.meta.url), "utf8"),
  );
  const text = catalog.outposts?.blocked_base_exists;
  assert.ok(text, `${lang}: нет outposts.blocked_base_exists`);
  assert.doesNotMatch(
    text,
    /газосборник|gas collector/i,
    `${lang}: текст про лимит базы всё ещё поминает газосборники`,
  );
}

// ── Тип планеты определяет, что добывает база ──────────────────────────────
// Иначе буровая выдаёт одни и те же минералы на вулканическом мире и на
// кристаллическом, и двенадцать типов планет базе безразличны
const { getModuleOutput } = await import("../src/game/constants/baseModules.ts");
const { PLANET_TYPES } = await import("../src/game/constants/planets.ts");

const drillYields = new Set(
  PLANET_TYPES.map((type) => Object.keys(getModuleOutput("drill_shaft", type)).sort().join("+")),
);
assert.ok(
  drillYields.size >= 4,
  `буровая даёт всего ${drillYields.size} разных набора на двенадцати типах планет — тип снова ничего не значит`,
);
// Скорость сохраняется: меняется что добывают, а не сколько
for (const type of PLANET_TYPES) {
  const out = getModuleOutput("drill_shaft", type);
  const total = Object.values(out).reduce((s, v) => s + v, 0);
  assert.ok(
    Math.abs(total - 0.56) < 1e-9,
    `${type}: суммарная скорость буровой ${total} вместо 0.56 — тип планеты меняет не только добычу, но и темп`,
  );
  for (const resource of Object.keys(out)) {
    assert.ok(getHaulKind(resource), `${type}: буровая даёт «${resource}», который некуда вывезти`);
  }
}
// Лаборатория следует планете только вторым образцом: главное у неё своё.
// Подставь мы планетный ресурс в первое значение — лаборатория на
// кристаллическом мире закрывала бы половину потребности дерева в квантовых
// кристаллах, а это уже не разнообразие, а обход всей добычи
for (const type of PLANET_TYPES) {
  const out = getModuleOutput("field_lab", type);
  assert.ok(
    (out.ancient_data ?? 0) >= 0.25,
    `${type}: лаборатория перестала копать древние данные — главное у неё своё`,
  );
  const total = Object.values(out).reduce((s, v) => s + v, 0);
  assert.ok(
    Math.abs(total - 0.45) < 1e-9,
    `${type}: суммарная скорость лаборатории ${total} вместо 0.45`,
  );
}
const labYields = new Set(
  PLANET_TYPES.map((type) =>
    Object.keys(getModuleOutput("field_lab", type)).sort().join("+"),
  ),
);
assert.ok(
  labYields.size >= 4,
  `лаборатория даёт всего ${labYields.size} разных набора на двенадцати типах — тип планеты ей безразличен`,
);
// Модули без followsPlanet отдают своё где угодно
assert.deepEqual(
  getModuleOutput("warehouse", "Вулканическая"),
  getModuleOutput("warehouse", "Ледяная"),
  "служебный модуль зависит от типа планеты, хотя не должен",
);

// Никакой мир не должен закрывать научным ресурсом больше трети потребности
// дерева: база разнообразит забег, а не заменяет собой исследования
const researchDemand = await (async () => {
  const demand = {};
  for (const tier of ["tier1", "tier2", "tier3", "tier4", "tier5"]) {
    const mod = await import(`../src/game/constants/research/${tier}.ts`);
    for (const tech of Object.values(mod).flatMap((v) =>
      Array.isArray(v) ? v : Object.values(v ?? {}),
    )) {
      for (const [resource, amount] of Object.entries(tech?.resources ?? {})) {
        demand[resource] = (demand[resource] ?? 0) + amount;
      }
    }
  }
  return demand;
})();
for (const type of PLANET_TYPES) {
  for (const [resource, rate] of Object.entries(
    getModuleOutput("field_lab", type),
  )) {
    const total = researchDemand[resource];
    if (!total) continue;
    // 100 ходов жизни базы — щедрая оценка забега, ×2 от черты не считаем:
    // на неё игроку ещё должно повезти
    const share = (rate * 100) / total;
    assert.ok(
      share <= 0.35,
      `${type}: лаборатория закрывает ${Math.round(share * 100)}% дерева по ${resource} — это уже не разнообразие`,
    );
  }
}

// ── Планета берёт своё: тип мира давит на выбор слотов ────────────────────
// Иначе тип планеты решает только, что копают, и «куда ставить базу» —
// вопрос про ресурсы, а не про сборку
const { PLANET_HAZARDS, getPlanetHazard, getHazardWorkTurns, PLANET_HAZARD_INTERVAL } =
  await import("../src/game/constants/planetHazards.ts");

const hazardTypes = new Set();
for (const hazard of PLANET_HAZARDS) {
  assert.ok(hazard.types.length > 0, `${hazard.id}: беда без планет`);
  for (const type of hazard.types) {
    assert.ok(
      PLANET_TYPES.includes(type),
      `${hazard.id}: несуществующий тип планеты ${type}`,
    );
    assert.ok(
      !hazardTypes.has(type),
      `${type}: две беды на одном типе — игрок увидит только одну`,
    );
    hazardTypes.add(type);
  }
  // Беда без последствия — просто строчка в интерфейсе
  assert.ok(
    hazard.outputPenalty ?? hazard.crewDamage ?? hazard.raidMultiplier ?? hazard.extraWorkTurns,
    `${hazard.id}: беда ничего не делает`,
  );
  if (hazard.answeredBy) {
    assert.ok(
      Object.values(BASE_MODULES).some((def) => def.service === hazard.answeredBy),
      `${hazard.id}: отвечать нечем — нет модуля с услугой ${hazard.answeredBy}`,
    );
  }
}
assert.ok(
  hazardTypes.size < PLANET_TYPES.length,
  "беда есть на каждом типе планет — тогда это не выбор, а налог",
);

// Толчки сбивают выработку, ремдок возвращает её
const shakyLocation = withoutIce;
const shakySectors = [
  { id: 1, locations: [{ id: shakyLocation, planetType: "Вулканическая" }] },
];
const mineWith = (modules) => {
  let outposts = [baseAt(shakyLocation, { modules })];
  for (let turn = 0; turn < 40; turn++) {
    outposts = accrueOutposts(outposts, shakySectors, engineer);
  }
  return outposts[0].bunker.minerals ?? 0;
};
assert.ok(
  mineWith(["drill_shaft"]) < mineWith(["drill_shaft", "repair_dock"]),
  "толчки не сбивают выработку — беда планеты ни на что не влияет",
);

// На месте старой войны захватывают чаще, турели возвращают безопасность
const { getRaidChance } = await import(
  "../src/game/slices/outposts/helpers/outpostRaids.ts"
);
const raidCtx = (planetType, locationId) => ({
  sectors: [{ id: 1, tier: 2, locations: [{ id: locationId, planetType }] }],
  crew: [],
  turn: 999,
});
const warBase = baseAt(withoutIce, { builtAtTurn: 0 });
const calmChance = getRaidChance(warBase, raidCtx("Пустынная", withoutIce));
const warChance = getRaidChance(warBase, raidCtx("Разрушенная войной", withoutIce));
assert.ok(
  warChance > calmChance,
  "на разрушенной войной планете база в такой же безопасности, как в пустыне",
);
assert.ok(
  getRaidChance(
    baseAt(withoutIce, { builtAtTurn: 0, modules: ["turrets"] }),
    raidCtx("Разрушенная войной", withoutIce),
  ) < calmChance,
  "турели не отбивают надбавку за известные координаты",
);

// Мороз стоит времени, и это единственная беда без ответа
assert.ok(getHazardWorkTurns("Ледяная") > 0, "мороз ничего не стоит");
assert.equal(getHazardWorkTurns("Пустынная"), 0);
assert.equal(getPlanetHazard("Ледяная").answeredBy, undefined);
assert.ok(
  source("game/slices/outposts/helpers/buildBase.ts").includes("getHazardWorkTurns"),
  "срок работ не учитывает планету — мороз виден только в описании",
);
assert.ok(
  source("game/slices/outposts/helpers/processOutpostCrew.ts").includes(
    "PLANET_HAZARD_INTERVAL",
  ),
  "радиация не бьёт по гарнизону — беда осталась текстом",
);
assert.ok(PLANET_HAZARD_INTERVAL > 1, "беда планеты бьёт каждый ход — это не риск, а расписание");

// ── Новости базы бывают местными ──────────────────────────────────────────
const { BASE_EVENTS } = await import("../src/game/constants/baseEvents.ts");
const localEvents = BASE_EVENTS.filter((event) => event.planetTypes);
assert.ok(
  localEvents.length >= 4,
  "местных новостей почти нет — база снова стоит «где-то»",
);
for (const event of localEvents) {
  for (const type of event.planetTypes) {
    assert.ok(
      PLANET_TYPES.includes(type),
      `${event.id}: несуществующий тип планеты ${type}`,
    );
  }
  // Местная новость обязана перевешивать общую, иначе её просто не увидят
  assert.ok(
    event.weight > Math.max(...BASE_EVENTS.filter((e) => !e.planetTypes).map((e) => e.weight)),
    `${event.id}: местная новость весит не больше общих — на своём мире её почти не будет`,
  );
}
for (const lang of ["ru", "en"]) {
  const catalog = JSON.parse(
    readFileSync(new URL(`../src/lib/locales/${lang}.json`, import.meta.url), "utf8"),
  );
  for (const event of BASE_EVENTS) {
    assert.ok(catalog.base_events?.[event.id], `${lang}: нет текста события ${event.id}`);
  }
  for (const hazard of PLANET_HAZARDS) {
    assert.ok(
      catalog.outposts?.[`hazard_${hazard.id}`],
      `${lang}: нет описания беды ${hazard.id}`,
    );
  }
  for (const key of ["hazard_answered", "hazard_handled"]) {
    assert.ok(catalog.outposts?.[key], `${lang}: нет outposts.${key}`);
  }
  assert.ok(
    catalog.game_logs?.outpost_hazard_harm,
    `${lang}: нет лога outpost_hazard_harm`,
  );
}
assert.ok(
  source("game/components/BaseSection.tsx").includes("<HazardNote"),
  "панель не говорит, чем этот мир берёт своё",
);

// ── Гарнизон хочет тех, кто нужен установленным модулям ────────────────────
const { getWantedRoles, getOutpostOutputMultiplier } = await import(
  "../src/game/slices/outposts/helpers/outpostCrew.ts"
);
const labBase = baseAt(withIce, { modules: ["field_lab", "med_bay"] });
const roles = getWantedRoles(labBase);
assert.ok(
  roles.has("scientist") && roles.has("medic"),
  `база с лабораторией и медблоком хочет ${[...roles]} — профессия модулей не учитывается`,
);
assert.ok(
  !getWantedRoles(baseAt(withIce, { modules: [] })).has("scientist"),
  "пустая база хочет учёного — профиль по умолчанию потерян",
);
const scientistMult = getOutpostOutputMultiplier(labBase, [
  { id: 1, profession: "scientist", level: 1, outpostId: "b1" },
]);
const engineerMult = getOutpostOutputMultiplier(labBase, [
  { id: 1, profession: "engineer", level: 1, outpostId: "b1" },
]);
assert.ok(
  scientistMult > engineerMult,
  "на базе с лабораторией инженер не хуже учёного — у гарнизона один правильный ответ",
);

// ── Услуги базы не бесплатны ───────────────────────────────────────────────
// Иначе станционный ремонт нужен только когда некогда лететь
const { BASE_SERVICE_VALUES: SV } = await import(
  "../src/game/constants/baseModules.ts"
);
for (const cost of [SV.repairCost, SV.healCost]) {
  assert.ok(cost?.quantity > 0, "услуга базы ничего не стоит");
  assert.ok(getHaulKind(cost.item) === "good", `${cost.item}: платить нечем`);
}
assert.match(
  source("game/slices/outposts/helpers/useBaseServices.ts"),
  /takeSupplies\(/,
  "ремонт и лечение на базе снова даровые",
);

// ── События на базе ────────────────────────────────────────────────────────
const { BASE_EVENT_CHANCE } = await import(
  "../src/game/constants/baseEvents.ts"
);
assert.ok(BASE_EVENTS.length >= 3, "событий слишком мало, чтобы они не приелись");
assert.ok(
  BASE_EVENT_CHANCE > 0 && BASE_EVENT_CHANCE <= 0.05,
  `шанс события ${BASE_EVENT_CHANCE} — база превращается во второй источник дохода`,
);
for (const event of BASE_EVENTS) {
  assert.ok(event.weight > 0, `${event.id}: нулевой вес`);
  assert.ok(
    event.bunker || event.credits || event.morale,
    `${event.id}: событие ничего не делает`,
  );
  for (const resource of Object.keys(event.bunker ?? {})) {
    assert.ok(getHaulKind(resource), `${event.id}: даёт невывозимое «${resource}»`);
  }
}
assert.ok(
  BASE_EVENTS.some((e) => (e.morale ?? 0) < 0),
  "все события приятные — на базе нечему идти не так",
);
assert.match(
  source("game/slices/outposts/helpers/processBaseEvents.ts"),
  /capturedAtTurn === undefined/,
  "захваченная база продолжает присылать новости",
);

// ── Ретранслятор ловит работу в соседних секторах ─────────────────────────
// Контракты лежат на планетах с генерации: модуль не создаёт работу, он даёт
// услышать её, не прилетая
const { getRelayOffers, getNeighbourSectors } = await import(
  "../src/game/slices/outposts/helpers/relayContracts.ts"
);

const mkSector = (id, tier, angle, contracts = []) => ({
  id,
  tier,
  name: `S${id}`,
  mapAngle: angle,
  locations: [
    { id: `p${id}`, name: `P${id}`, type: "planet", contracts },
  ],
});
const relaySectors = [
  mkSector(1, 2, 0, [{ id: "c-home", reward: 100, desc: "contracts.desc_scan_planet" }]),
  mkSector(2, 2, 0.2, [{ id: "c-near", reward: 500, desc: "contracts.desc_scan_planet" }]),
  mkSector(3, 3, 0.3, [{ id: "c-tier3", reward: 900, desc: "contracts.desc_scan_planet" }]),
  mkSector(4, 4, 0.4, [{ id: "c-far-tier", reward: 9999, desc: "contracts.desc_scan_planet" }]),
  mkSector(5, 2, 3.1, [{ id: "c-far-angle", reward: 700, desc: "contracts.desc_scan_planet" }]),
];
const relayBase = { ...baseAt(withIce, { modules: ["relay"] }), sectorId: 1 };

const offers = getRelayOffers([relayBase], relaySectors);
const ids = offers.map((o) => o.contract.id);
assert.ok(ids.includes("c-near"), "ретранслятор не слышит ближний сектор");
assert.ok(
  !ids.includes("c-home"),
  "ретранслятор показывает свой же сектор — там и так всё видно",
);
assert.ok(
  !ids.includes("c-far-tier"),
  "ретранслятор дотягивается через два тира — соседство перестаёт что-то значить",
);
assert.deepEqual(
  [...offers].sort((a, b) => b.contract.reward - a.contract.reward).map((o) => o.contract.id),
  ids,
  "предложения не отсортированы по награде — список для выбора маршрута, а не каталог",
);

// Без модуля молчит
assert.deepEqual(
  getRelayOffers([baseAt(withIce, { modules: [] })], relaySectors),
  [],
  "предложения приходят без ретранслятора",
);
assert.deepEqual(
  getRelayOffers([{ ...relayBase, capturedAtTurn: 3 }], relaySectors),
  [],
  "захваченная база продолжает ловить контракты",
);
assert.deepEqual(getNeighbourSectors(relaySectors, undefined), []);

// Список только читается: брать контракт по-прежнему можно лишь на месте
const relayUi = source("game/components/RelayOffers.tsx");
for (const action of ["acceptContract", "onClick"]) {
  assert.ok(
    !relayUi.includes(action),
    `сводка ретранслятора позволяет ${action} — исчезает смысл куда-то лететь`,
  );
}
assert.match(
  source("game/components/CampaignProgressPanel.tsx"),
  /<RelayOffers/,
  "предложения ретранслятора негде посмотреть",
);

// ── Локали и подключение к экрану ──────────────────────────────────────────
assert.match(
  source("game/components/EmptyPlanetPanel.tsx"),
  /BaseSection/,
  "базу негде заложить: раздел не подключён к панели пустой планеты",
);

// Что даст планета, надо знать ДО того, как потратить 6000₢
const { getBasePotential } = await import(
  "../src/game/slices/outposts/helpers/canBuildBase.ts"
);
const plainPotential = getBasePotential(withoutIce);
assert.ok(
  !plainPotential.available.includes("cryo_cracker"),
  "прогноз обещает крекер там, где его не поставить",
);
assert.ok(
  plainPotential.available.length > 0,
  "прогноз утверждает, что на планете нельзя вообще ничего",
);
assert.ok(
  getBasePotential(withIce).available.includes("cryo_cracker"),
  "прогноз не видит крекер там, где лёд есть",
);
assert.ok(
  getBasePotential(richDeposits).boosted.includes("drill_shaft"),
  "прогноз не показывает удвоение буровой на богатых залежах",
);
assert.match(
  source("game/components/BaseSection.tsx"),
  /getBasePotential\(/,
  "игрок не видит, что даст планета, пока не потратит 6000₢",
);
// Черты говорят, что здесь возможно, но не что из этого выйдет: буровая
// следует за типом планеты, и на разрушенной войной даёт одну науку
const buildScreen = source("game/components/BaseSection.tsx");
assert.ok(
  buildScreen.includes("potential_drill") &&
    buildScreen.includes('getModuleOutput("drill_shaft", location.planetType)'),
  "прогноз молчит о том, что буровая будет добывать на этом типе планеты",
);
assert.notDeepEqual(
  Object.keys(getModuleOutput("drill_shaft", "Кристаллическая")),
  Object.keys(getModuleOutput("drill_shaft", "Вулканическая")),
  "прогноз буровой одинаков на разных типах — показывать его незачем",
);
for (const lang of ["ru", "en"]) {
  const catalog = JSON.parse(
    readFileSync(new URL(`../src/lib/locales/${lang}.json`, import.meta.url), "utf8"),
  );
  for (const key of [
    "potential_available",
    "potential_boosted",
    "potential_plain",
    "potential_drill",
  ]) {
    assert.ok(catalog.outposts?.[key], `${lang}: нет outposts.${key}`);
  }
}

for (const lang of ["ru", "en"]) {
  const catalog = JSON.parse(
    readFileSync(new URL(`../src/lib/locales/${lang}.json`, import.meta.url), "utf8"),
  );
  for (const id of moduleIds) {
    assert.ok(catalog.base_modules?.[id]?.name, `${lang}: нет имени модуля ${id}`);
    assert.ok(catalog.base_modules?.[id]?.desc, `${lang}: нет описания модуля ${id}`);
  }
  for (const key of ["base", "build_base", "base_hint", "bunker", "dismantle", "upgrade", "blocked_not_explored", "status_title", "relay_title", "relay_hint", "services", "service_repair", "service_heal", "service_store", "service_craft", "service_hire"]) {
    assert.ok(catalog.outposts?.[key], `${lang}: нет outposts.${key}`);
  }
  for (const key of ["base_settler_hired", "base_settler_arrived", "base_withdrawn", "outpost_built_base", "base_upgraded", "base_module_installed", "base_module_removed", "outpost_build_remote", "base_repaired", "base_healed", "base_stored", "base_service_remote"]) {
    assert.ok(catalog.game_logs?.[key], `${lang}: нет лога ${key}`);
  }
}

// ── Стройка занимает ходы ─────────────────────────────────────────────────
// Мгновенная постройка обесценивает решение «строить сейчас или подкопить»:
// платишь один раз и в тот же ход получаешь всё. Пока работы идут, постройка
// не добывает и не обслуживает — иначе срок ничего не стоит.
const { isUnderConstruction, turnsUntilReady, scheduleWork } = await import(
  "../src/game/slices/outposts/helpers/construction.ts"
);
const { BASE_BUILD_TURNS, BASE_UPGRADE_TURNS, BASE_MODULE_BUILD_TURNS } =
  await import("../src/game/constants/baseModules.ts");
const { RAID_GRACE_TURNS } = await import(
  "../src/game/constants/outpostRaids.ts"
);

const building = baseAt(withIce, {
  modules: ["drill_shaft", "warehouse"],
  readyAtTurn: 20,
});
assert.ok(isUnderConstruction(building), "стройка не видна потребителям");
assert.equal(turnsUntilReady(building, 14), 6);
assert.equal(turnsUntilReady(building, 25), 0, "срок ушёл в минус");
assert.deepEqual(
  accrueOutposts([building], sectors, engineer)[0].bunker,
  {},
  "недостроенная база добывает — срок работ ничего не стоит",
);
assert.equal(
  hasBaseService(building, "storage"),
  false,
  "недостроенная база обслуживает — срок работ ничего не стоит",
);
assert.equal(
  hasBaseService({ ...building, readyAtTurn: undefined }, "storage"),
  true,
  "достроенная база не обслуживает",
);
// Работы складываются: модуль поверх недостроенной базы ждёт своей очереди
assert.equal(scheduleWork(building, 15, BASE_MODULE_BUILD_TURNS), 24);
assert.equal(scheduleWork(baseAt(withIce), 15, BASE_MODULE_BUILD_TURNS), 19);

for (const turns of [BASE_BUILD_TURNS, BASE_UPGRADE_TURNS, BASE_MODULE_BUILD_TURNS]) {
  assert.ok(turns > 0, "работы идут ноль ходов — постройка снова мгновенна");
  assert.ok(
    turns < RAID_GRACE_TURNS,
    `работы (${turns}) дольше льготы рейдов (${RAID_GRACE_TURNS}) — стройплощадку захватят`,
  );
}

// ── Цена в ходах видна до нажатия ─────────────────────────────────────────
// Закладка, модуль, расширение и любая услуга двигают ход. Пока об этом не
// написано на самой кнопке, самый дорогой ресурс игры тратится втёмную
const panel = source("game/components/BaseSection.tsx");
for (const key of ["outposts.turn_cost", "outposts.cost_turns"]) {
  assert.ok(panel.includes(key), `панель базы не показывает ${key}`);
}
assert.ok(
  panel.includes("BASE_MODULE_BUILD_TURNS") &&
    panel.includes("BASE_UPGRADE_TURNS"),
  "срок работ по модулю и расширению не показан — он известен только после оплаты",
);

// ── Работы не подменяют собой панель ──────────────────────────────────────
// Заказ модуля прятал бункер, гарнизон и склад вместе с оставленным грузом,
// хотя ни collectOutpost, ни withdrawFromBase этого не запрещают
assert.ok(
  !/if \(isUnderConstruction\(base\)\) \{\s*return/.test(panel),
  "панель базы снова схлопывается на время работ — со склада не забрать своё",
);
assert.ok(
  panel.includes("outposts.work_banner"),
  "идущие работы не отмечены на живой панели",
);
assert.ok(
  panel.includes("hasStored") && panel.includes("outposts.stored_here"),
  "склад показывается только вместе с услугой — во время работ своё не забрать",
);

// ── Срок считается от очереди работ, а не от номинала ─────────────────────
// Модуль поверх недостроенной базы ждёт дольше своих четырёх ходов, и ход
// забирает само нажатие: «работы 4» на кнопке были бы просто неправдой
assert.ok(
  panel.includes("scheduleWork(base, turn + 1"),
  "срок на кнопке взят из констант — очередь работ и потраченный ход в него не входят",
);

// ── Панель разложена по вкладкам, каталог модулей не висит простынёй ──────
// Десять кнопок с описаниями под слотами занимали больше места, чем сама
// база; свободный слот при этом было не сосчитать
for (const key of [
  "tab_overview",
  "tab_services",
  "tab_storage",
  "tab_garrison",
  "slot_empty",
  "module_catalog",
]) {
  assert.ok(panel.includes(key), `панель базы не использует ${key}`);
}
assert.ok(
  panel.includes("<ModuleCatalog") && panel.includes("setCatalogOpen(true)"),
  "каталог модулей снова раскрыт прямо в панели",
);
assert.ok(
  /summary_slots[\s\S]{0,400}summary_bunker[\s\S]{0,400}summary_garrison/.test(panel),
  "шапка не показывает сводку — вкладки прячут и полный бункер, и пустой гарнизон",
);
// У вкладок разное содержимое: если область тянется по нему, переключение
// двигает по вертикали всю планетарную панель под базой
assert.match(
  panel,
  /<div className="h-\[[^"]+\] overflow-y-auto/,
  "область вкладок снова тянется по содержимому — кнопки под базой прыгают",
);

// ── Панель показывает выработку, а не только имя модуля ───────────────────
// Добыча дробная (0.5/ход), и без строки «минералы 1.00 за ход» посчитать,
// когда прилетать, нечем. Число обязано совпадать с тем, что копит движок
assert.ok(
  panel.includes("getModuleOutput(") && panel.includes("module_output"),
  "панель не показывает выработку модуля",
);

const shownBase = baseAt(richDeposits, { modules: ["drill_shaft"] });
const shownCrew = [
  { id: 1, profession: "engineer", level: 1, outpostId: "b1" },
];
// Та же формула, что в строке модуля: выход × черта планеты × гарнизон
const shownRate =
  getModuleOutput("drill_shaft", undefined).minerals *
  2 *
  getOutpostOutputMultiplier(shownBase, shownCrew);
let mined = [shownBase];
const minedSectors = [{ id: 1, locations: [{ id: richDeposits }] }];
for (let turn = 0; turn < 30; turn++) {
  mined = accrueOutposts(mined, minedSectors, shownCrew);
}
assert.ok(
  Math.abs((mined[0].bunker.minerals ?? 0) - shownRate * 30) <= 1,
  `панель обещает ${shownRate.toFixed(2)}/ход, а движок накопил ${mined[0].bunker.minerals} за 30 ходов`,
);

// ── Снос переспрашивает, услуги называют эффект, казарма — нужную роль ────
assert.ok(
  panel.includes("confirmRemove") && panel.includes("dismantle_confirm"),
  "снос модуля снова в одно нажатие — промах стоит половины цены и всех материалов",
);
for (const key of ["service_repair_effect", "service_heal_effect"]) {
  assert.ok(panel.includes(key), `услуга не говорит, что сделает: ${key}`);
}
assert.ok(
  panel.includes("BASE_SERVICE_VALUES.repairAmount") &&
    panel.includes("BASE_SERVICE_VALUES.healAmount"),
  "эффект услуги набран числом в тексте — разъедется с BASE_SERVICE_VALUES",
);
assert.ok(
  panel.includes("getWantedRoles(") && panel.includes("hire_wanted"),
  "казарма предлагает пять профессий без разницы между ними",
);
assert.deepEqual(
  [...getWantedRoles(baseAt(withIce, { modules: ["field_lab", "med_bay"] }))],
  ["scientist", "medic"],
  "база хочет не тех, кто нужен её модулям",
);

// ── Штурм: видно, с чем идёшь и что вернётся ──────────────────────────────
assert.ok(
  source("game/components/OutpostGarrison.tsx").includes("previewMultiplier"),
  "гарнизон не показывает, что даст пересадка — множитель меняется вслепую",
);
for (const what of ["ShipStatsPanel", "captured_stake"]) {
  assert.ok(panel.includes(what), `штурм захваченной базы не показывает ${what}`);
}

// ── Полный бункер базы виден ──────────────────────────────────────────────
const { isBunkerFull: bunkerFull } = await import(
  "../src/game/slices/outposts/helpers/accrueOutposts.ts"
);
assert.equal(
  bunkerFull(baseAt(withIce, { bunker: { minerals: BASE_BUNKER_CAP } })),
  true,
  "база с полным бункером не считается полной — добыча встала, а сказать некому",
);
assert.equal(
  bunkerFull(baseAt(withIce, { bunker: { minerals: BASE_BUNKER_CAP - 1 } })),
  false,
  "бункер считается полным раньше потолка",
);
assert.ok(
  panel.includes("BASE_BUNKER_CAP") && panel.includes("bunker_full_base"),
  "панель не показывает, сколько влезло в бункер и что он полон",
);
assert.match(
  source("game/components/OutpostStatusList.tsx"),
  /bunker_full_base/,
  "сводка объясняет полный бункер базы текстом про газосборник",
);

// ── Расширение отказывает до нажатия, а не в бортжурнал ───────────────────
const { getUpgradeBlocker } = await import(
  "../src/game/slices/outposts/helpers/buildBase.ts"
);
const upgradeCost = BASE_UPGRADE_COST[1];
const affordUpgrade = {
  credits: upgradeCost.credits,
  research: { resources: { ...upgradeCost.resources } },
};
assert.equal(getUpgradeBlocker(affordUpgrade, baseAt(withIce)), null);
assert.equal(
  getUpgradeBlocker({ ...affordUpgrade, credits: 0 }, baseAt(withIce)),
  "not_enough_credits",
);
assert.equal(
  getUpgradeBlocker(
    { credits: upgradeCost.credits, research: { resources: {} } },
    baseAt(withIce),
  ),
  "not_enough_resources",
);
assert.equal(
  getUpgradeBlocker(affordUpgrade, baseAt(withIce, { level: BASE_MAX_LEVEL })),
  "max_level",
  "максимальный уровень предлагает расшириться ещё раз",
);
assert.ok(
  panel.includes("getUpgradeBlocker"),
  "кнопка расширения не гаснет: цена и отказ известны только после клика",
);

for (const lang of ["ru", "en"]) {
  const catalog = JSON.parse(
    readFileSync(new URL(`../src/lib/locales/${lang}.json`, import.meta.url), "utf8"),
  );
  for (const key of [
    "turn_cost",
    "cost_turns",
    "work_banner",
    "bunker_full_base",
    "stored_here",
    "slot_empty",
    "module_catalog",
    "tab_overview",
    "tab_services",
    "tab_storage",
    "tab_garrison",
    "summary_slots",
    "summary_bunker",
    "summary_garrison",
    "summary_output",
    "module_output",
    "dismantle_confirm",
    "service_repair_effect",
    "service_heal_effect",
    "hire_wanted",
    "captured_stake",
    "captured_modules",
    "captured_your_ship",
  ]) {
    assert.ok(catalog.outposts?.[key], `${lang}: нет outposts.${key}`);
  }
}

console.log("Base checks passed");
console.log(
  `  ${moduleIds.length} модулей, слотов по уровням ${BASE_SLOTS_BY_LEVEL.slice(1).join("/")}, база ${BASE_COST.credits}₢`,
);
