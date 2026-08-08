import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
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

// ── Локали и подключение к экрану ──────────────────────────────────────────
assert.match(
  source("game/components/EmptyPlanetPanel.tsx"),
  /BaseSection/,
  "базу негде заложить: раздел не подключён к панели пустой планеты",
);

for (const lang of ["ru", "en"]) {
  const catalog = JSON.parse(
    readFileSync(new URL(`../src/lib/locales/${lang}.json`, import.meta.url), "utf8"),
  );
  for (const id of moduleIds) {
    assert.ok(catalog.base_modules?.[id]?.name, `${lang}: нет имени модуля ${id}`);
    assert.ok(catalog.base_modules?.[id]?.desc, `${lang}: нет описания модуля ${id}`);
  }
  for (const key of ["base", "build_base", "base_hint", "bunker", "dismantle", "upgrade", "blocked_not_explored", "services", "service_repair", "service_heal", "service_store"]) {
    assert.ok(catalog.outposts?.[key], `${lang}: нет outposts.${key}`);
  }
  for (const key of ["outpost_built_base", "base_upgraded", "base_module_installed", "base_module_removed", "outpost_build_remote", "base_repaired", "base_healed", "base_stored", "base_service_remote"]) {
    assert.ok(catalog.game_logs?.[key], `${lang}: нет лога ${key}`);
  }
}

console.log("Base checks passed");
console.log(
  `  ${moduleIds.length} модулей, слотов по уровням ${BASE_SLOTS_BY_LEVEL.slice(1).join("/")}, база ${BASE_COST.credits}₢`,
);
