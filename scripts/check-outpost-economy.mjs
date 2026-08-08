import assert from "node:assert/strict";
import "./register-ts-loader.mjs";

/**
 * Экономика построек: окупаются ли они и не обгоняют ли остальную игру.
 *
 * Главный риск всей системы записан в плане прямым текстом: если постройка
 * отбивается быстро, оптимальной стратегией становится «построил и забыл»,
 * и вся игра сворачивается в ожидание. Здесь это считается в числах, а не
 * на глаз.
 */

const { BASE_MODULES, BASE_COST, BASE_SLOTS_BY_LEVEL, BASE_MAX_LEVEL, BASE_UPGRADE_COST } =
  await import("../src/game/constants/baseModules.ts");
const {
  GAS_BASE_PRICE,
  GAS_SELL_RATE,
  GAS_COLLECTOR_BUNKER_CAP,
  GAS_COLLECTOR_COST,
  GAS_COLLECTOR_FILL_TURNS,
  OUTPOST_LIMITS,
} = await import("../src/game/constants/outposts.ts");
const { TRADE_GOODS } = await import("../src/game/constants/goods.ts");
const { RESEARCH_RESOURCES } = await import(
  "../src/game/constants/research/resources.ts"
);
const { calculateCombatLoot } = await import(
  "../src/game/slices/combat/helpers/combatSetup.ts"
);
const { CONTRACT_REWARDS } = await import("../src/game/contracts/rewards.ts");

/**
 * Кредитная стоимость единицы добычи. Научные образцы кредитов не приносят
 * вовсе — их ценность в исследованиях, — поэтому считаем их нулём и тем
 * самым оцениваем базу консервативно, по деньгам.
 */
const creditValue = (resource) => {
  if (resource in GAS_BASE_PRICE) {
    return Math.round(GAS_BASE_PRICE[resource] * GAS_SELL_RATE);
  }
  if (resource in TRADE_GOODS) return TRADE_GOODS[resource].basePrice;
  if (resource in RESEARCH_RESOURCES) return 0;
  throw new Error(`неизвестный ресурс добычи: ${resource}`);
};

// ── Газосборник: окупаемость в целевом окне ───────────────────────────────
const bestGas = Math.max(
  ...Object.entries(GAS_BASE_PRICE)
    .filter(([, price]) => price > 0)
    .map(([, price]) => Math.round(price * GAS_SELL_RATE)),
);
const collectorPayback =
  (GAS_COLLECTOR_COST.credits / (bestGas * GAS_COLLECTOR_BUNKER_CAP)) *
  GAS_COLLECTOR_FILL_TURNS;
assert.ok(
  collectorPayback >= 60 && collectorPayback <= 160,
  `газосборник окупается за ${Math.round(collectorPayback)} ходов — вне разумного окна`,
);

// ── База: самая доходная сборка на максимальном уровне ────────────────────
const earners = Object.values(BASE_MODULES)
  .filter((def) => Object.keys(def.output).length > 0)
  .map((def) => ({
    id: def.id,
    perTurn: Object.entries(def.output).reduce(
      (sum, [resource, amount]) => sum + amount * creditValue(resource),
      0,
    ),
    cost: def.cost.credits,
  }))
  .sort((a, b) => b.perTurn - a.perTurn);

const maxSlots = BASE_SLOTS_BY_LEVEL[BASE_MAX_LEVEL];
const best = earners.slice(0, maxSlots);
// Черты планеты могут удвоить выход добывающих модулей — считаем худший для
// баланса случай, когда игроку повезло со всеми сразу
const bestPerTurn = best.reduce((sum, mod) => sum + mod.perTurn * 2, 0);
const totalInvested =
  BASE_COST.credits +
  BASE_UPGRADE_COST.slice(1).reduce((sum, up) => sum + (up?.credits ?? 0), 0) +
  best.reduce((sum, mod) => sum + mod.cost, 0);
const basePayback = totalInvested / bestPerTurn;

assert.ok(
  basePayback >= 80,
  `база окупается за ${Math.round(basePayback)} ходов — «построил и забыл» побеждает «играл»`,
);
assert.ok(
  basePayback <= 220,
  `база окупается за ${Math.round(basePayback)} ходов — вложение бессмысленно`,
);

// ── База не должна обгонять активную игру ─────────────────────────────────
// Эталон: бой и контракт на тире 3 — то, чем игрок зарабатывает руками
const battleTier3 = calculateCombatLoot(3, undefined, 0.5);
const contractTier3 =
  CONTRACT_REWARDS.scan_planet.base[2] + CONTRACT_REWARDS.scan_planet.range[2] / 2;
const activePerTurn = Math.min(battleTier3, contractTier3) / 3; // бой и контракт занимают несколько ходов

assert.ok(
  bestPerTurn < activePerTurn,
  `база даёт ${bestPerTurn.toFixed(0)}₢ за ход против ${activePerTurn.toFixed(0)}₢ активной игры — сидеть выгоднее, чем летать`,
);

// ── Все постройки разом тоже не должны перекрывать активный доход ─────────
const collectorPerTurn = bestGas; // 1 единица лучшего газа за ход при инженере
const everything = bestPerTurn + collectorPerTurn * OUTPOST_LIMITS.gas_collector;
assert.ok(
  everything < activePerTurn * 2,
  `все постройки дают ${everything.toFixed(0)}₢ за ход — пассивный доход перевешивает игру`,
);

// ── Ни один добывающий модуль не должен затмевать остальные ───────────────
// Считаем только по деньгам: лаборатория платит наукой, и сравнивать её
// с буровой в кредитах бессмысленно
const paying = earners.filter((mod) => mod.perTurn > 0);
assert.ok(paying.length >= 2, "нечего сравнивать: доходных модулей меньше двух");
const spread = paying[0].perTurn / paying[paying.length - 1].perTurn;
assert.ok(
  spread <= 4,
  `разброс доходности модулей ×${spread.toFixed(1)} — слабые никогда не поставят`,
);

// ── Интеграция: итоги забега и справка ────────────────────────────────────
import { readFileSync } from "node:fs";
const source = (path) =>
  readFileSync(new URL(`../src/${path}`, import.meta.url), "utf8");

assert.match(
  source("game/metaProgress/runSummary.ts"),
  /outpostsBuilt/,
  "постройки не попадают в итоги забега — их как будто не было",
);
assert.match(
  source("game/components/panels/HelpPanel.tsx"),
  /help\.outposts_title/,
  "в справке нет раздела про аванпосты",
);
for (const lang of ["ru", "en"]) {
  const catalog = JSON.parse(
    readFileSync(new URL(`../src/lib/locales/${lang}.json`, import.meta.url), "utf8"),
  );
  for (const key of [
    "outposts_title",
    "outposts_text",
    "outposts_gate",
    "outposts_bunker",
    "outposts_crew",
    "outposts_base",
    "outposts_raids",
  ]) {
    assert.ok(catalog.help?.[key], `${lang}: нет help.${key}`);
  }
}

console.log("Outpost economy checks passed");
console.log(
  `  сборщик окупается за ${Math.round(collectorPayback)} ходов; база за ${Math.round(basePayback)}`,
);
console.log(
  `  база ${bestPerTurn.toFixed(0)}₢/ход, все постройки ${everything.toFixed(0)}₢/ход, активная игра ~${activePerTurn.toFixed(0)}₢/ход`,
);
