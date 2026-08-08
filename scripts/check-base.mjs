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
});
assert.equal(
  getStorageUsed(stocked),
  14,
  "объём склада считается не по всему, что на нём лежит",
);
assert.equal(
  getStorageFree(stocked),
  BASE_SERVICE_VALUES.storageCapacity - 14,
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
assert.match(
  hire,
  /getShipCrew\(state\.crew\)\.length >= state\.getCrewCapacity\(\)/,
  "наём на базе обходит лимит экипажа",
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
// Модули без followsPlanet отдают своё где угодно
assert.deepEqual(
  getModuleOutput("field_lab", "Вулканическая"),
  getModuleOutput("field_lab", "Ледяная"),
  "лаборатория зависит от типа планеты, хотя не должна",
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
const { BASE_EVENTS, BASE_EVENT_CHANCE } = await import(
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
for (const lang of ["ru", "en"]) {
  const catalog = JSON.parse(
    readFileSync(new URL(`../src/lib/locales/${lang}.json`, import.meta.url), "utf8"),
  );
  for (const key of ["potential_available", "potential_boosted", "potential_plain"]) {
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
  for (const key of ["base", "build_base", "base_hint", "bunker", "dismantle", "upgrade", "blocked_not_explored", "status_title", "services", "service_repair", "service_heal", "service_store", "service_craft", "service_hire"]) {
    assert.ok(catalog.outposts?.[key], `${lang}: нет outposts.${key}`);
  }
  for (const key of ["base_hired", "base_hire_no_room", "base_withdrawn", "outpost_built_base", "base_upgraded", "base_module_installed", "base_module_removed", "outpost_build_remote", "base_repaired", "base_healed", "base_stored", "base_service_remote"]) {
    assert.ok(catalog.game_logs?.[key], `${lang}: нет лога ${key}`);
  }
}

console.log("Base checks passed");
console.log(
  `  ${moduleIds.length} модулей, слотов по уровням ${BASE_SLOTS_BY_LEVEL.slice(1).join("/")}, база ${BASE_COST.credits}₢`,
);
