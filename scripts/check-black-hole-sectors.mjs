import assert from "node:assert/strict";
import "./register-ts-loader.mjs";

const { BLACK_HOLE_LOCATION_CHANCES } = await import(
  "../src/game/galaxy/config.ts"
);
const { generateLocation } = await import("../src/game/galaxy/getLocation.ts");

// ── Доли обязаны давать ровно 1: остаток молча утёк бы в аномалии ────────────
const total = Object.values(BLACK_HOLE_LOCATION_CHANCES).reduce(
  (sum, value) => sum + value,
  0,
);
assert.ok(
  Math.abs(total - 1) < 1e-9,
  `сумма долей сектора ЧД должна быть 1, получено ${total}`,
);

// ── Каждый объявленный тип обязан реально выпадать ──────────────────────────
const ROLLS = 20000;
const counts = {};
const beltTiers = new Set();
for (let index = 0; index < ROLLS; index += 1) {
  const location = generateLocation(1, index, 3, true, "blackhole");
  counts[location.type] = (counts[location.type] ?? 0) + 1;
  if (location.type === "asteroid_belt") beltTiers.add(location.asteroidTier);
}

const EXPECTED_TYPES = [
  "anomaly",
  "enemy",
  "planet",
  "storm",
  "asteroid_belt",
  "derelict_ship",
  "wreck_field",
  "distress_signal",
];
for (const type of EXPECTED_TYPES) {
  assert.ok(
    (counts[type] ?? 0) > 0,
    `${type} объявлен в таблице ЧД, но ни разу не выпал — доля недостижима`,
  );
}

// ── У сингулярности не живут и не торгуют ───────────────────────────────────
for (const type of ["station", "friendly_ship", "gas_giant"]) {
  assert.equal(
    counts[type] ?? 0,
    0,
    `${type} не должен появляться в секторе с чёрной дырой`,
  );
}

// ── Планеты у ЧД всегда мертвы: ни расы, ни населения, ни контрактов ────────
let deadPlanets = 0;
for (let index = 0; index < ROLLS; index += 1) {
  const location = generateLocation(1, index, 3, true, "blackhole");
  if (location.type !== "planet") continue;
  deadPlanets += 1;
  assert.equal(location.isEmpty, true, "планета у ЧД обязана быть пустой");
  assert.equal(location.dominantRace, undefined);
  assert.equal(location.population, undefined);
  assert.equal(
    location.scoutingAvailable,
    true,
    "мёртвый мир обязан оставаться разведываемым — иначе он пустая точка",
  );
}
assert.ok(deadPlanets > 0);

// ── Осколки у ЧД чаще древние: это и есть плата за риск сектора ─────────────
assert.ok(
  beltTiers.has(4),
  "приливные силы обязаны иногда вскрывать древние пояса",
);
const ancientShare = (isBlackHole) => {
  let ancient = 0;
  let all = 0;
  for (let index = 0; index < ROLLS; index += 1) {
    const location = generateLocation(
      1,
      index,
      3,
      isBlackHole,
      isBlackHole ? "blackhole" : "white_dwarf",
    );
    if (location.type !== "asteroid_belt") continue;
    all += 1;
    if (location.asteroidTier === 4) ancient += 1;
  }
  return all > 0 ? ancient / all : 0;
};
assert.ok(
  ancientShare(true) > ancientShare(false),
  "пояса у ЧД обязаны быть древними чаще обычных",
);

console.log("Black hole sector checks passed");
