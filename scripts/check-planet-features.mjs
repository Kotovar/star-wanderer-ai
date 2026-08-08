import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import "./register-ts-loader.mjs";

/**
 * Особенности пустых планет: распределение, локали и эффекты.
 * Черты выводятся детерминированно из id планеты, поэтому проверяем не
 * «сгенерировалось ли», а «каждая ли черта вообще достижима и не съела ли
 * новая четвёрка старую».
 */

const {
  PLANET_FEATURES,
  getPlanetFeatures,
  planetHasFeature,
  SEISMIC_DRILL_YIELD_BONUS,
  SEISMIC_DRILL_DAMAGE,
  SEISMIC_DRILL_DAMAGE_CHANCE,
  ICE_CAPS_FUEL,
  LOW_GRAVITY_EXPEDITION_AP,
  RUINED_SETTLEMENT_RUINS_WEIGHT,
} = await import("../src/game/planets/features.ts");

const ALL = Object.keys(PLANET_FEATURES);
assert.equal(ALL.length, 8, "ожидалось восемь особенностей");

// ── Каждая черта достижима, ни одна не доминирует ──────────────────────────
const SAMPLE = 20000;
const counts = Object.fromEntries(ALL.map((f) => [f, 0]));
let planetsWithout = 0;
let totalFeatures = 0;
for (let i = 0; i < SAMPLE; i++) {
  const features = getPlanetFeatures(`planet-${i}-x`);
  assert.ok(features.length <= 2, "не больше двух черт на планету");
  assert.equal(
    new Set(features).size,
    features.length,
    "черта не должна дублироваться на одной планете",
  );
  if (features.length === 0) planetsWithout++;
  totalFeatures += features.length;
  for (const f of features) counts[f]++;
}

const share = (n) => n / SAMPLE;
for (const [feature, n] of Object.entries(counts)) {
  const portion = n / totalFeatures;
  assert.ok(
    portion > 0.05,
    `${feature} практически не выпадает (${(portion * 100).toFixed(1)}% всех черт)`,
  );
  assert.ok(
    portion < 0.25,
    `${feature} доминирует (${(portion * 100).toFixed(1)}% всех черт)`,
  );
}
assert.ok(
  share(planetsWithout) > 0.15 && share(planetsWithout) < 0.35,
  `доля планет без черт вышла из коридора: ${(share(planetsWithout) * 100).toFixed(1)}%`,
);

// ── Детерминированность: тот же id — тот же ответ ──────────────────────────
assert.deepEqual(
  getPlanetFeatures("planet-42-x"),
  getPlanetFeatures("planet-42-x"),
  "черты обязаны быть детерминированы по id",
);

// ── Локали: имя и описание у каждой черты, на обоих языках ─────────────────
for (const lang of ["ru", "en"]) {
  const catalog = JSON.parse(
    readFileSync(new URL(`../src/lib/locales/${lang}.json`, import.meta.url), "utf8"),
  );
  for (const feature of ALL) {
    const entry = catalog.planet_features?.[feature];
    assert.ok(entry?.name, `${lang}: нет имени для ${feature}`);
    assert.ok(entry?.desc, `${lang}: нет описания для ${feature}`);
  }
  for (const key of ["drill_ice_caps", "drill_seismic_shock"]) {
    assert.ok(catalog.game_logs?.[key], `${lang}: нет лога ${key}`);
  }
}

// ── Каждая новая черта реально подключена к своему хелперу ─────────────────
const source = (path) =>
  readFileSync(new URL(`../src/${path}`, import.meta.url), "utf8");

const drill = source("game/slices/locations/helpers/planetaryDrill.ts");
assert.match(drill, /seismic_activity/, "сейсмика не подключена к буру");
assert.match(drill, /ice_caps/, "ледяные шапки не подключены к буру");
assert.match(
  drill,
  /m\.id === drill\.id/,
  "сейсмика обязана бить по конкретному буру, а не по случайному модулю",
);

const expedition = source("game/slices/locations/helpers/expedition/startExpedition.ts");
assert.match(expedition, /low_gravity/, "низкая гравитация не подключена к экспедиции");
assert.match(
  expedition,
  /ruined_settlement/,
  "заброшенное поселение не подключено к сетке экспедиции",
);

// ── Числа заданы и осмысленны ──────────────────────────────────────────────
assert.ok(SEISMIC_DRILL_YIELD_BONUS > 0 && SEISMIC_DRILL_YIELD_BONUS < 1);
assert.ok(SEISMIC_DRILL_DAMAGE_CHANCE > 0 && SEISMIC_DRILL_DAMAGE_CHANCE < 1);
assert.ok(SEISMIC_DRILL_DAMAGE > 0);
assert.ok(ICE_CAPS_FUEL > 0);
assert.ok(LOW_GRAVITY_EXPEDITION_AP > 0);
assert.ok(RUINED_SETTLEMENT_RUINS_WEIGHT > 0);

// ── Сейсмика — сделка, а не подарок: бур изнашивается быстрее, чем окупается
// один проход, если бурить вслепую все проходы подряд.
const expectedDamagePerPass = SEISMIC_DRILL_DAMAGE_CHANCE * SEISMIC_DRILL_DAMAGE;
assert.ok(
  expectedDamagePerPass >= 5,
  "ожидаемый урон за проход слишком мал — сейсмика станет бесплатным бонусом",
);

// ── Заброшенное поселение реально сдвигает сетку в сторону руин ────────────
const { getWeightsForRace } = await import(
  "../src/game/slices/locations/helpers/expedition/tileWeights.ts"
);
const plain = getWeightsForRace("human");
const ruined = getWeightsForRace("human", undefined, undefined, {
  ruins: RUINED_SETTLEMENT_RUINS_WEIGHT,
});
assert.equal(
  ruined.ruins,
  plain.ruins + RUINED_SETTLEMENT_RUINS_WEIGHT,
  "вес руин не вырос",
);
assert.equal(plain.market, ruined.market, "прочие веса трогать не должны");

// ── planetHasFeature согласован с getPlanetFeatures ────────────────────────
const probe = "planet-7-x";
for (const feature of ALL) {
  assert.equal(
    planetHasFeature(probe, feature),
    getPlanetFeatures(probe).includes(feature),
    `${feature}: planetHasFeature разошёлся с getPlanetFeatures`,
  );
}

console.log("Planet feature checks passed");
for (const [feature, n] of Object.entries(counts)) {
  console.log(`  ${PLANET_FEATURES[feature].icon} ${feature}: ${(n / totalFeatures * 100).toFixed(1)}% всех черт`);
}
