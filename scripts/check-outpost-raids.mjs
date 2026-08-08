import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import "./register-ts-loader.mjs";

/**
 * Рейды на постройки.
 *
 * До этой фазы аванпост был чистым плюсом без риска. Захват даёт системе то,
 * чего ей не хватало, — что-то, что можно потерять. Проверка следит за двумя
 * вещами: что риск реально зависит от решений игрока и что потеря обратима
 * усилием, а не удачей.
 */

const source = (path) =>
  readFileSync(new URL(`../src/${path}`, import.meta.url), "utf8");

const { getRaidChance, getRaidThreat } = await import(
  "../src/game/slices/outposts/helpers/outpostRaids.ts"
);
const {
  RAID_BASE_CHANCE,
  RAID_GRACE_TURNS,
  RAID_CRISIS_ID,
  RAID_TIER_MULTIPLIER,
} = await import("../src/game/constants/outpostRaids.ts");
const { BASE_SERVICE_VALUES, BASE_MODULES } = await import(
  "../src/game/constants/baseModules.ts"
);
const { accrueOutposts } = await import(
  "../src/game/slices/outposts/helpers/accrueOutposts.ts"
);

const sectors = [
  { id: 1, tier: 1, locations: [{ id: "loc-1" }] },
  { id: 4, tier: 4, locations: [{ id: "loc-4" }] },
];
const outpost = (over = {}) => ({
  id: "o1",
  kind: "gas_collector",
  locationId: "loc-1",
  sectorId: 1,
  builtAtTurn: 0,
  bunker: {},
  ...over,
});
const ctx = (over = {}) => ({
  sectors,
  crew: [],
  turn: 100,
  ...over,
});

// ── Льготный период: постройка не разваливается сразу после закладки ───────
assert.equal(
  getRaidChance(outpost({ builtAtTurn: 95 }), ctx({ turn: 100 })),
  0,
  "рейд возможен сразу после постройки — вложение обесценивается случайностью",
);
assert.ok(
  getRaidChance(outpost(), ctx({ turn: RAID_GRACE_TURNS + 1 })) > 0,
  "после льготного периода риск так и не появляется",
);

// ── Захваченную не захватывают повторно ────────────────────────────────────
assert.equal(getRaidChance(outpost({ capturedAtTurn: 5 }), ctx()), 0);

// ── Риск растёт от решений игрока ──────────────────────────────────────────
const shallow = getRaidChance(outpost(), ctx());
const deep = getRaidChance(
  outpost({ locationId: "loc-4", sectorId: 4 }),
  ctx(),
);
assert.ok(
  deep > shallow,
  "глубокий сектор не опаснее — «куда строить» перестаёт быть решением",
);
assert.ok(
  getRaidChance(outpost(), ctx({ activeCrisisId: RAID_CRISIS_ID })) > shallow,
  "рейдерская волна не поднимает риск — кризис остаётся налогом, а не событием",
);
assert.ok(
  getRaidChance(outpost(), ctx({ startModifierIds: ["wanted"] })) > shallow,
  "«В розыске» не достаёт до построек — модификатор не отражается на них",
);

// ── И падает от вложений в защиту ──────────────────────────────────────────
const turreted = getRaidChance(outpost({ modules: ["turrets"] }), ctx());
assert.ok(turreted < shallow, "турели не снижают риск");
assert.ok(
  Math.abs(turreted - shallow * BASE_SERVICE_VALUES.turretProtection) < 1e-9,
  "турели снижают риск не на заявленную величину",
);
const guarded = getRaidChance(
  outpost(),
  ctx({ crew: [{ id: 1, profession: "gunner", outpostId: "o1" }] }),
);
assert.ok(guarded < shallow, "охранник в гарнизоне не снижает риск");
assert.equal(
  getRaidChance(
    outpost(),
    ctx({ crew: [{ id: 2, profession: "gunner", outpostId: "другой" }] }),
  ),
  shallow,
  "охранник чужой постройки защищает эту",
);

// ── Накопленный риск за забег ──────────────────────────────────────────────
// Пошаговая вероятность обманчива: 1.2% за ход давали 84% шанс потерять
// постройку хотя бы раз за 150 ходов, а на четвёртом тире 99%. Проверять
// надо именно накопленное число, иначе «риск» оказывается расписанием.
const RUN_TURNS = 150;
const overRun = (p) => 1 - Math.pow(1 - p, RUN_TURNS);

const deepRisk = overRun(deep);
assert.ok(
  overRun(shallow) <= 0.3,
  `на первом тире постройку теряют в ${(overRun(shallow) * 100).toFixed(0)}% забегов — это уже не риск, а расписание`,
);
assert.ok(
  deepRisk <= 0.55,
  `на четвёртом тире постройку теряют в ${(deepRisk * 100).toFixed(0)}% забегов`,
);
assert.ok(
  deepRisk >= 0.15,
  `на четвёртом тире риск ${(deepRisk * 100).toFixed(0)}% за забег — угрозы фактически нет`,
);
const protectedRisk = overRun(
  getRaidChance(
    outpost({ locationId: "loc-4", sectorId: 4, modules: ["turrets"] }),
    ctx({ crew: [{ id: 1, profession: "gunner", outpostId: "o1" }] }),
  ),
);
assert.ok(
  protectedRisk <= 0.2,
  `даже с турелями и стрелком риск ${(protectedRisk * 100).toFixed(0)}% за забег — вложения в защиту не окупаются`,
);

// ── Отбитую постройку не отбирают на следующем ходу ────────────────────────
assert.equal(
  getRaidChance(
    outpost({ raidGraceUntil: 210 }),
    ctx({ turn: 200 }),
  ),
  0,
  "после отбития льготы нет — штурм превращается в карусель",
);
assert.match(
  source("game/slices/outposts/helpers/assaultOutpost.ts"),
  /raidGraceUntil: s\.turn \+ RAID_GRACE_TURNS/,
  "возврат постройки не даёт передышки",
);

// Шанс остаётся в разумных пределах даже при всех надбавках сразу
const worst = getRaidChance(
  outpost({ locationId: "loc-4", sectorId: 4 }),
  ctx({ activeCrisisId: RAID_CRISIS_ID, startModifierIds: ["wanted"] }),
);
assert.ok(
  worst <= 0.2,
  `худший шанс ${(worst * 100).toFixed(1)}% за ход — постройку невозможно удержать`,
);
assert.ok(RAID_BASE_CHANCE > 0 && RAID_TIER_MULTIPLIER.length >= 5);

// ── Захваченная постройка не работает, но и не исчезает ────────────────────
const captured = [
  outpost({ capturedAtTurn: 10, bunker: { deuterium: 12 } }),
];
const gasSectors = [
  { id: 1, tier: 1, locations: [{ id: "loc-1", gasGiantAtmosphere: "hydrogen" }] },
];
let held = captured;
for (let turn = 0; turn < 30; turn++) {
  held = accrueOutposts(held, gasSectors, []);
}
assert.equal(
  held[0].bunker.deuterium,
  12,
  "захваченная постройка продолжает добывать — терять нечего",
);
assert.equal(held.length, 1, "постройка исчезла вместо захвата");

// ── Победа возвращает постройку вместе с бункером ──────────────────────────
const assault = source("game/slices/outposts/helpers/assaultOutpost.ts");
assert.match(
  assault,
  /capturedAtTurn: undefined/,
  "победа не снимает захват",
);
assert.doesNotMatch(
  assault,
  /bunker: \{\}/,
  "возврат обнуляет бункер — рейдеры держали добычу, а не проедали её",
);
assert.match(
  assault,
  /currentLocation\?\.id !== outpost\.locationId/,
  "штурмовать можно, не прилетая на место",
);
assert.match(
  source("game/slices/combat/helpers/playerVictory.ts"),
  /resolveOutpostAssault\(/,
  "возврат постройки не подключён к обработке победы",
);

// Победа обязана быть одержана на месте: иначе достаточно начать штурм,
// отступить и выиграть любой другой бой, чтобы постройка вернулась даром
assert.match(
  assault,
  /state\.currentLocation\?\.id !== outpost\.locationId/,
  "возврат не проверяет место боя — чужая победа засчитается за отбитие",
);
assert.match(
  assault,
  /assaultingOutpostId: null/,
  "пометка о штурме не снимается и потянется за игроком в следующие бои",
);

// Угроза рейдеров растёт с тиром: отбивать в глубоком секторе труднее
assert.ok(
  getRaidThreat(outpost({ sectorId: 4 }), sectors) >
    getRaidThreat(outpost({ sectorId: 1 }), sectors),
  "рейдеры одинаковы во всей галактике",
);

// ── Турели — обычный модуль базы, занимающий слот ──────────────────────────
assert.equal(
  BASE_MODULES.turrets.service,
  "defense",
  "турели не оказывают услуги защиты",
);
assert.deepEqual(
  BASE_MODULES.turrets.output,
  {},
  "турели что-то добывают — модуль обязан делать одно дело",
);

// ── Обе панели показывают захват вместо обычного содержимого ───────────────
for (const path of [
  "game/components/BaseSection.tsx",
  "game/components/GasCollectorSection.tsx",
]) {
  assert.match(
    source(path),
    /capturedAtTurn !== undefined/,
    `${path}: захваченная постройка выглядит как рабочая`,
  );
  assert.match(source(path), /assaultOutpost\(/, `${path}: нельзя начать штурм`);
}

// ── Локали ─────────────────────────────────────────────────────────────────
for (const lang of ["ru", "en"]) {
  const catalog = JSON.parse(
    readFileSync(new URL(`../src/lib/locales/${lang}.json`, import.meta.url), "utf8"),
  );
  for (const key of ["captured", "captured_hint", "assault"]) {
    assert.ok(catalog.outposts?.[key], `${lang}: нет outposts.${key}`);
  }
  for (const key of [
    "outpost_captured",
    "outpost_captured_base",
    "outpost_assault_started",
    "outpost_retaken",
  ]) {
    assert.ok(catalog.game_logs?.[key], `${lang}: нет лога ${key}`);
  }
  assert.ok(catalog.locations?.outpost_raiders, `${lang}: рейдеры без имени`);
  assert.ok(catalog.base_modules?.turrets?.name, `${lang}: турели без имени`);
}

console.log("Outpost raid checks passed");
console.log(
  `  риск за ход: тир 1 ${(shallow * 100).toFixed(2)}%, тир 4 ${(deep * 100).toFixed(2)}%, худший ${(worst * 100).toFixed(2)}%, с турелями ${(turreted * 100).toFixed(2)}%`,
);
