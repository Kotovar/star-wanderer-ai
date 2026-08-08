import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import "./register-ts-loader.mjs";

const {
  ASTEROID_COLLISION_DRILL_DAMAGE,
  ASTEROID_PASSES_BY_TIER,
  ASTEROID_PASS_SHARES,
  ASTEROID_SURFACE_YIELD,
  getAsteroidCollisionChance,
  getAsteroidPassShare,
  getDrillWearMultiplier,
} = await import("../src/game/slices/locations/constants.ts");
const { resolveAsteroidPass } = await import(
  "../src/game/slices/locations/helpers/resolveAsteroidPass.ts"
);

const RESOURCES = { minerals: 100, rare: 40, credits: 200 };

const pass = (overrides = {}) =>
  resolveAsteroidPass({
    asteroidTier: 3,
    passesDone: 0,
    instability: 0,
    resources: RESOURCES,
    efficiency: 1,
    surfaceOnly: false,
    drillHealth: 100,
    collisionRoll: 0.99,
    ...overrides,
  });

// ── Первый проход всегда безопасен: долететь до пояса не должно быть ловушкой ─
assert.equal(getAsteroidCollisionChance(0, false), 0);
assert.equal(pass({ collisionRoll: 0 }).collided, false);

// ── Риск растёт с нестабильностью и обнуляется на поверхностном сборе ────────
const risks = [0, 1, 2, 3].map((value) => getAsteroidCollisionChance(value, false));
for (let i = 1; i < risks.length; i += 1) {
  assert.ok(risks[i] > risks[i - 1], "риск обязан расти с нестабильностью");
}
assert.ok(risks[risks.length - 1] <= 1, "риск не может превышать 100%");
assert.equal(getAsteroidCollisionChance(3, true), 0);

// ── Нестабильность растёт монотонно, но только на глубоких проходах ──────────
let instability = 0;
for (let done = 0; done < 4; done += 1) {
  const next = pass({ passesDone: done, instability }).nextInstability;
  assert.ok(next > instability, "глубокий проход обязан поднимать нестабильность");
  instability = next;
}
assert.equal(pass({ instability: 2, surfaceOnly: true }).nextInstability, 2);

// ── Столкновение бьёт только по буру, и ровно на заявленный урон ─────────────
const collided = pass({ instability: 3, collisionRoll: 0 });
assert.equal(collided.collided, true);
assert.equal(collided.drillDamage, ASTEROID_COLLISION_DRILL_DAMAGE);
assert.equal(collided.nextDrillHealth, 100 - ASTEROID_COLLISION_DRILL_DAMAGE);
const safe = pass({ instability: 3, collisionRoll: 0.99 });
assert.equal(safe.drillDamage, 0);
assert.equal(safe.nextDrillHealth, 100);

// ── Добитый бур закрывает добычу и не уходит в минус ─────────────────────────
const finishedOff = pass({
  instability: 3,
  collisionRoll: 0,
  drillHealth: ASTEROID_COLLISION_DRILL_DAMAGE - 5,
});
assert.equal(finishedOff.nextDrillHealth, 0);
assert.equal(finishedOff.drillDestroyed, true);
assert.equal(pass({ drillHealth: 100 }).drillDestroyed, false);

// ── Залежи глубже богаче — иначе «ещё один проход» не был бы вопросом ────────
for (let i = 1; i < ASTEROID_PASS_SHARES.length; i += 1) {
  assert.ok(
    ASTEROID_PASS_SHARES[i] > ASTEROID_PASS_SHARES[i - 1],
    "каждая следующая залежь обязана быть богаче предыдущей",
  );
}
assert.equal(getAsteroidPassShare(-1), ASTEROID_PASS_SHARES[0]);
assert.equal(
  getAsteroidPassShare(99),
  ASTEROID_PASS_SHARES[ASTEROID_PASS_SHARES.length - 1],
);
assert.ok(
  pass({ passesDone: 2 }).minerals > pass({ passesDone: 0 }).minerals,
  "третий проход обязан давать больше первого",
);

// ── Уйти после первого прохода дешевле, выбрать пояс целиком — выгоднее ──────
const fullHaul = (tier) => {
  let total = 0;
  for (let done = 0; done < ASTEROID_PASSES_BY_TIER[tier]; done += 1) {
    total += pass({ asteroidTier: tier, passesDone: done }).minerals;
  }
  return total;
};
assert.ok(
  pass({ passesDone: 0 }).minerals < RESOURCES.minerals,
  "один проход обязан давать меньше объявленных запасов пояса",
);
assert.ok(
  fullHaul(3) > RESOURCES.minerals,
  "полностью выбранный пояс обязан окупать риск",
);

// ── Пояс закрывается ровно на последнем проходе своего тира ──────────────────
for (const tier of [1, 2, 3, 4]) {
  const total = ASTEROID_PASSES_BY_TIER[tier];
  assert.equal(pass({ asteroidTier: tier, passesDone: total - 2 }).exhausted, false);
  assert.equal(pass({ asteroidTier: tier, passesDone: total - 1 }).exhausted, true);
}

// ── Поверхностный сбор: мало, но всегда доступно — локация не тупик ──────────
const surface = pass({ efficiency: ASTEROID_SURFACE_YIELD, surfaceOnly: true });
assert.ok(surface.minerals > 0, "поверхностный сбор обязан что-то давать");
assert.ok(
  surface.minerals < pass().minerals,
  "поверхностный сбор обязан быть беднее нормальной добычи",
);

// ── Износ бура: целый копает вдвое лучше добитого ────────────────────────────
assert.equal(getDrillWearMultiplier(100, 100), 1);
assert.equal(getDrillWearMultiplier(0, 100), 0.5);
assert.equal(getDrillWearMultiplier(50, 100), 0.75);
assert.equal(getDrillWearMultiplier(150, 100), 1, "перелечённый бур не даёт бонуса");
assert.equal(getDrillWearMultiplier(50, 0), 1, "нулевой maxHealth не ломает расчёт");

// ── Никаких отрицательных выдач при странных входных данных ─────────────────
const degenerate = pass({
  efficiency: -5,
  resources: { minerals: -10, rare: 0, credits: 0 },
});
assert.equal(degenerate.minerals, 0);
assert.equal(degenerate.rare, 0);
assert.equal(degenerate.credits, 0);

// ── Инварианты, недостижимые для чистой функции ──────────────────────────────
const mineAsteroidSource = readFileSync(
  new URL("../src/game/slices/locations/helpers/mineAsteroid.ts", import.meta.url),
  "utf8",
);
// Без patchLocation прогресс проходов пропадает при выходе из локации:
// currentSector пересобирается из galaxy, и пояс фармится бесконечно
assert.match(
  mineAsteroidSource,
  /patchLocation\(s, loc\.id, \{[\s\S]*?asteroidPassesDone/,
  "прогресс пояса обязан сохраняться через patchLocation",
);
// Столкновение бьёт по буру — по инструменту, от которого зависит добыча
assert.match(
  mineAsteroidSource,
  /m\.id === drill\.id[\s\S]*?health: pass\.nextDrillHealth/,
  "урон от столкновения обязан приходиться именно на бур",
);
assert.doesNotMatch(
  mineAsteroidSource,
  /mineAsteroid_5/,
  "жёсткий гейт по тиру бура снят — локация больше не тупик",
);

console.log("Asteroid belt checks passed");
