import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";

const require = createRequire(import.meta.url);
const scriptPath = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(scriptPath), "..");
const jiti = require("jiti")(scriptPath, {
  alias: { "@": path.join(root, "src") },
});

const { crossedTurnInterval } = jiti("../src/game/utils/turnTicks.ts");
const { shuffle } = jiti("../src/game/utils/shuffle.ts");

// ─── Тики «раз в N ходов» ────────────────────────────────────────────────────

assert.equal(
  crossedTurnInterval({ turn: 50, lastProcessedTurn: 49 }, 50),
  true,
  "обычный ход на кратном номере обязан отдать тик",
);

assert.equal(
  crossedTurnInterval({ turn: 49, lastProcessedTurn: 48 }, 50),
  false,
  "некратный ход тик не отдаёт",
);

assert.equal(
  crossedTurnInterval({ turn: 51, lastProcessedTurn: 49 }, 50),
  true,
  "перепрыгнутый кратный ход (орбитальный скан, бой) обязан догнать тик",
);

assert.equal(
  crossedTurnInterval({ turn: 53, lastProcessedTurn: 47 }, 50),
  true,
  "прыжок счётчика на 6 ходов через границу — тик один раз",
);

assert.equal(
  crossedTurnInterval({ turn: 60, lastProcessedTurn: 50 }, 50),
  false,
  "внутри одного периода второй раз не платим",
);

assert.equal(
  crossedTurnInterval({ turn: 50 }, 50),
  true,
  "старое сохранение без lastProcessedTurn ведёт себя как раньше",
);

// ─── Перестановка ────────────────────────────────────────────────────────────

const items = [1, 2, 3, 4, 5];
assert.deepEqual(
  [...shuffle(items)].sort((a, b) => a - b),
  items,
  "перестановка сохраняет состав",
);
assert.deepEqual(items, [1, 2, 3, 4, 5], "исходный массив не мутируется");

// Равномерность: у sort(() => Math.random() - 0.5) первый элемент застревает
// на месте заметно чаще 1/n. Проверяем, что распределение позиций ровное.
const RUNS = 12000;
const positions = new Array(items.length).fill(0);
for (let run = 0; run < RUNS; run += 1) {
  positions[shuffle(items).indexOf(1)] += 1;
}
const expected = RUNS / items.length;
for (const [index, count] of positions.entries()) {
  assert.ok(
    Math.abs(count - expected) < expected * 0.2,
    `позиция ${index}: ${count} против ожидаемых ~${expected} — перестановка смещена`,
  );
}

// Свой генератор — детерминированный результат (ассортимент станции по seed).
const seeded = (seed) => {
  let state = seed;
  return () => {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    return state / 0x80000000;
  };
};
assert.deepEqual(
  shuffle(items, seeded(42)),
  shuffle(items, seeded(42)),
  "один seed — одна перестановка",
);

console.log("check-turn-tick-fixes: OK");
