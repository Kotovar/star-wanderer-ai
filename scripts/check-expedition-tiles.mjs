import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import "./register-ts-loader.mjs";

/**
 * Словари клеток экспедиции. Главная жалоба к пустым планетам была в том,
 * что высадка на них не отличается от высадки на населённую, и виноват был
 * общий словарь: на необитаемой планете можно было найти рынок. Проверка
 * следит, чтобы словари остались раздельными и чтобы ни один тип клетки не
 * оказался без обработчика — такая клетка молча съедала бы очко действия.
 */

const { getWeightsForRace, pickWeightedTile } = await import(
  "../src/game/slices/locations/helpers/expedition/tileWeights.ts"
);
const { generateExpeditionGrid } = await import(
  "../src/game/slices/locations/helpers/expedition/generateExpeditionGrid.ts"
);
const {
  getCoreSampleResource,
  EXPEDITION_SIGNAL_PEEKS,
  POPULATED_TILE_TYPES,
  EMPTY_PLANET_TILE_TYPES,
  getTileTypesFor,
} = await import(
  "../src/game/slices/locations/helpers/expedition/constants.ts"
);
const { PLANET_POINT_OF_INTERESTS, PLANET_TYPES } = await import(
  "../src/game/constants/planets.ts"
);
const { RESEARCH_RESOURCES } = await import(
  "../src/game/constants/research/resources.ts"
);

const POPULATED_ONLY = ["market", "lab", "incident"];
const EMPTY_ONLY = ["cache", "core_sample", "hazard", "signal"];
// ── Необитаемые планеты: ни рынка, ни лаборатории, ни инцидента ────────────
const allPois = [...new Set(Object.values(PLANET_POINT_OF_INTERESTS))];
assert.ok(allPois.length > 0, "не нашёл ни одной точки интереса");

for (const poi of allPois) {
  const weights = getWeightsForRace(undefined, poi);
  for (const type of POPULATED_ONLY) {
    assert.ok(
      !(weights[type] > 0),
      `${poi}: клетка «${type}» осталась на необитаемой планете — ровно эта общность и делала обе высадки одинаковыми`,
    );
  }
  const emptyPresent = EMPTY_ONLY.filter((type) => weights[type] > 0);
  assert.ok(
    emptyPresent.length >= 3,
    `${poi}: словарь необитаемой планеты почти не использует свои клетки (${emptyPresent.join(", ") || "ни одной"})`,
  );
}

// ── Населённые планеты: свой словарь не протёк к ним ───────────────────────
for (const race of ["human", "synthetic", "krylorian", undefined]) {
  const weights = getWeightsForRace(race);
  for (const type of EMPTY_ONLY) {
    assert.ok(
      !(weights[type] > 0),
      `раса ${race}: клетка «${type}» протекла на населённую планету`,
    );
  }
  assert.ok(weights.market > 0, `раса ${race}: рынок обязан остаться`);
}

// ── Сетка реально состоит из новых клеток ──────────────────────────────────
const grid = generateExpeditionGrid(undefined, "resource_vein", "Пустынная");
assert.equal(grid.length, 25);
const seen = new Set(grid.map((tile) => tile.type));
for (const type of POPULATED_ONLY) {
  assert.ok(!seen.has(type), `сгенерированная сетка содержит «${type}»`);
}

// Все четыре новые клетки достижимы за разумное число сеток
const reachable = new Set();
for (let i = 0; i < 400; i++) {
  for (const poi of allPois) {
    for (const tile of generateExpeditionGrid(undefined, poi, "Пустынная")) {
      reachable.add(tile.type);
    }
  }
}
for (const type of EMPTY_ONLY) {
  assert.ok(reachable.has(type), `клетка «${type}» никогда не выпадает`);
}

// ── Каждый тип клетки имеет обработчик ─────────────────────────────────────
const source = (path) =>
  readFileSync(new URL(`../src/${path}`, import.meta.url), "utf8");

const explorationSource = source("game/types/exploration.ts");
const declaredTypes = explorationSource
  .slice(explorationSource.indexOf("export type ExploreTileType"))
  .split(";")[0]
  .match(/"([a-z_]+)"/g)
  .map((quoted) => quoted.replaceAll('"', ""));
assert.equal(declaredTypes.length, 9, "ожидалось девять типов клеток");

const revealSource = source(
  "game/slices/locations/helpers/expedition/revealExpeditionTile.ts",
);
for (const type of declaredTypes) {
  assert.ok(
    revealSource.includes(`case "${type}"`),
    `«${type}» не обрабатывается при вскрытии — клетка молча съест очко действия`,
  );
}

// ── Оформление: цвет и иконка на каждый тип, в обоих экранах ───────────────
for (const path of [
  "game/components/ExpeditionMapCanvas.tsx",
  "game/components/PlanetExplorationPanel.tsx",
]) {
  const markup = source(path);
  for (const type of declaredTypes) {
    assert.ok(
      new RegExp(`\\b${type}:`).test(markup),
      `${path}: у «${type}» нет оформления`,
    );
  }
}

// ── Спрайт-лист: индексы, счётчик кадров и сам файл сходятся ───────────────
const canvasSource = source("game/components/ExpeditionMapCanvas.tsx");
assert.match(
  canvasSource,
  /const TILE_SPRITE_INDEX: Partial</,
  "карта спрайтов обязана оставаться частичной: новый тип клетки может появиться раньше своей картинки",
);
assert.match(
  canvasSource,
  /spriteIndex === undefined/,
  "нет защиты от типа без спрайта — drawImage возьмёт кусок за границей листа",
);

const spriteCount = Number(
  canvasSource.match(/EXPEDITION_LOCATION_SPRITE_COUNT = (\d+)/)?.[1],
);
const spriteIndices = [
  ...canvasSource
    .slice(
      canvasSource.indexOf("const TILE_SPRITE_INDEX"),
      canvasSource.indexOf("};", canvasSource.indexOf("const TILE_SPRITE_INDEX")),
    )
    .matchAll(/(\w+): (\d+)/g),
].map(([, type, index]) => [type, Number(index)]);

assert.deepEqual(
  spriteIndices.map(([type]) => type).sort(),
  [...declaredTypes].sort(),
  "у какого-то типа клетки нет кадра в спрайт-листе",
);
assert.deepEqual(
  spriteIndices.map(([, index]) => index).sort((a, b) => a - b),
  [...Array(spriteCount).keys()],
  "индексы кадров не покрывают лист без дыр и повторов",
);

// Файл на диске обязан содержать ровно столько кадров, сколько обещает код,
// и каждая ячейка — что-то видимое. Иначе клетка отрисуется пустой.
const sheet = readFileSync(
  new URL("../public/assets/expedition_locations.webp", import.meta.url),
);
// RIFF-WEBP с альфой пишется расширенным контейнером VP8X: ширина холста
// лежит по смещению 24 тремя байтами little-endian и хранится как «минус один»
assert.equal(
  sheet.toString("ascii", 12, 16),
  "VP8X",
  "спрайт-лист перестал быть расширенным webp — разбор ширины ниже сломается",
);
const width = sheet.readUIntLE(24, 3) + 1;
assert.ok(width > 0, "не удалось прочитать ширину спрайт-листа");
assert.equal(
  width % spriteCount,
  0,
  `ширина листа ${width} не делится на ${spriteCount} кадров — кадры поедут на доли пикселя`,
);

// Ручные поправки центрирования сняты вместе с выравниванием листа
assert.doesNotMatch(
  canvasSource,
  /TILE_SPRITE_OFFSET/,
  "вернулась ручная компенсация центрирования — значит лист снова кривой",
);

// ── Керн зависит от типа планеты — ради этого он и заменил лабораторию ─────
const coreResources = new Set(
  PLANET_TYPES.map((type) => getCoreSampleResource(type)),
);
assert.ok(
  coreResources.size >= 4,
  `керн отдаёт слишком однообразную добычу (${[...coreResources].join(", ")}) — тип планеты снова ничего не значит`,
);
for (const resource of coreResources) {
  assert.ok(
    RESEARCH_RESOURCES[resource],
    `керн отдаёт несуществующий ресурс ${resource}`,
  );
}
assert.ok(
  getCoreSampleResource(undefined),
  "керн обязан работать и без известного типа планеты",
);

// ── Локали: у каждого нового лога есть текст на обоих языках ───────────────
const LOG_KEYS = [
  "expedition_tile_cache",
  "expedition_tile_core_sample",
  "expedition_tile_hazard",
  "expedition_tile_signal",
  "expedition_tile_signal_empty",
];
for (const lang of ["ru", "en"]) {
  const catalog = JSON.parse(
    readFileSync(new URL(`../src/lib/locales/${lang}.json`, import.meta.url), "utf8"),
  );
  for (const key of LOG_KEYS) {
    assert.ok(catalog.game_logs?.[key], `${lang}: нет лога ${key}`);
  }
}

assert.ok(EXPEDITION_SIGNAL_PEEKS > 0, "сигнал обязан что-то подсвечивать");

// ── Легенда обещает ровно то, что генерация умеет положить в сетку ─────────
// Пока легенда рисовала весь союз типов, игрок на необитаемой планете видел
// в подсказках рынок и лабораторию, которых там не бывает.
const generatedOnEmpty = new Set();
for (let i = 0; i < 400; i++) {
  for (const poi of allPois) {
    for (const tile of generateExpeditionGrid(undefined, poi, "Пустынная")) {
      generatedOnEmpty.add(tile.type);
    }
  }
}
assert.deepEqual(
  [...generatedOnEmpty].sort(),
  [...EMPTY_PLANET_TILE_TYPES].sort(),
  "легенда необитаемой планеты разошлась с тем, что генерируется",
);

const generatedOnPopulated = new Set();
for (let i = 0; i < 400; i++) {
  for (const race of ["human", "synthetic", "xenosymbiont", "krylorian"]) {
    for (const tile of generateExpeditionGrid(race)) {
      generatedOnPopulated.add(tile.type);
    }
  }
}
assert.deepEqual(
  [...generatedOnPopulated].sort(),
  [...POPULATED_TILE_TYPES].sort(),
  "легенда населённой планеты разошлась с тем, что генерируется",
);

assert.deepEqual(getTileTypesFor(true), EMPTY_PLANET_TILE_TYPES);
assert.deepEqual(getTileTypesFor(false), POPULATED_TILE_TYPES);

// ── У каждой клетки есть человеческий ярлык на обоих языках ────────────────
const panelSource = source("game/components/PlanetExplorationPanel.tsx");
assert.match(
  panelSource,
  /getTileTypesFor\(isEmptyPlanet\)/,
  "легенда снова перечисляет все типы разом, вместо словаря этой планеты",
);
assert.doesNotMatch(
  panelSource,
  /tile_supply_cache/,
  "старая подмена ярлыка рынка на пустой планете больше не нужна: схрон теперь настоящая клетка",
);

for (const lang of ["ru", "en"]) {
  const catalog = JSON.parse(
    readFileSync(new URL(`../src/lib/locales/${lang}.json`, import.meta.url), "utf8"),
  );
  for (const type of declaredTypes) {
    assert.ok(
      catalog.planet_panel?.[`tile_${type}`],
      `${lang}: нет ярлыка легенды tile_${type}`,
    );
  }
}

// ── pickWeightedTile не спотыкается о частичный словарь ────────────────────
const partial = { cache: 1 };
for (let i = 0; i < 50; i++) {
  assert.equal(
    pickWeightedTile(partial),
    "cache",
    "словарь из одного типа обязан всегда возвращать его",
  );
}

console.log("Expedition tile checks passed");
console.log(`  необитаемые: ${[...reachable].sort().join(", ")}`);
