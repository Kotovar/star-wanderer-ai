import assert from "node:assert/strict";
import "./register-ts-loader.mjs";

/**
 * Сохранение и загрузка построек.
 *
 * Целостность сейва ломается тихо: игрок узнаёт о потере через неделю игры,
 * а не в момент ошибки. Проверка гоняет полный круг — сериализация, чтение,
 * миграция старого сейва — и сравнивает состояние побайтно.
 */

const { loadWithMigrations, serializeWithVersion } = await import(
  "../src/game/saves/migrations.ts"
);
const { CURRENT_STATE_VERSION } = await import(
  "../src/game/constants/version.ts"
);

// ── Сейв, сделанный до аванпостов, обязан загружаться ──────────────────────
// Первое же обращение к outposts или gases роняло игру: полей просто не было
// Это v23: миграция 23 → 24 впервые добавляет outposts и gases. Версию нельзя
// выводить из CURRENT_STATE_VERSION, иначе fixture перестаёт быть pre-outpost.
const PRE_OUTPOST_SAVE_VERSION = 23;
const legacy = loadWithMigrations(
  JSON.stringify({
    version: PRE_OUTPOST_SAVE_VERSION,
    state: { stateVersion: PRE_OUTPOST_SAVE_VERSION, credits: 100, crew: [] },
  }),
);
assert.ok(legacy, "сейв предыдущей версии не загрузился");
assert.deepEqual(legacy.outposts, [], "миграция не добавила outposts");
assert.deepEqual(legacy.gases, {}, "миграция не добавила gases");

// ── Сиротский контрактный груз из старого сейва удаляется ─────────────────
const staleContractCargo = loadWithMigrations(
  JSON.stringify({
    version: 31,
    state: {
      stateVersion: 31,
      activeContracts: [{ id: "active-contract" }],
      ship: {
        cargo: [
          { item: "fuel", quantity: 2, contractId: "expired-contract" },
          { item: "ore", quantity: 1, contractId: "active-contract" },
        ],
      },
      outposts: [
        {
          id: "b-stale",
          storedCargo: [
            { item: "fuel", quantity: 2, contractId: "expired-contract" },
            { item: "ore", quantity: 1, contractId: "active-contract" },
          ],
        },
      ],
    },
  }),
);
assert.deepEqual(
  staleContractCargo?.ship.cargo,
  [{ item: "ore", quantity: 1, contractId: "active-contract" }],
  "сиротский контрактный груз должен уйти из трюма при миграции",
);
assert.deepEqual(
  staleContractCargo?.outposts[0].storedCargo,
  [{ item: "ore", quantity: 1, contractId: "active-contract" }],
  "сиротский контрактный груз должен уйти со склада при миграции",
);

// ── Постройка со всеми полями переживает круг без потерь ───────────────────
// Перечислено намеренно всё: забытое при сериализации поле означает молча
// пропавший прогресс, склад или захват
const outpost = {
  id: "b1",
  kind: "base",
  locationId: "p1",
  sectorId: 1,
  builtAtTurn: 5,
  bunker: { minerals: 12, deuterium: 3, ancient_data: 4 },
  level: 2,
  modules: ["drill_shaft", "warehouse", "med_bay"],
  storedCargo: [
    { item: "relic", quantity: 3, contractId: "c1" },
    { item: "engine", quantity: 1, isModule: true, moduleLevel: 2 },
  ],
  storedGoods: { water: 6, deuterium: 2 },
  moduleProgress: { minerals: 45, ancient_data: 12 },
  progress: 60,
  lastCollectedAtTurn: 12,
  capturedAtTurn: 9,
  raiderThreat: 3,
  raidGraceUntil: 30,
  readyAtTurn: 14,
  pendingSettler: { profession: "medic", race: "human", arrivesAtTurn: 18 },
};

const restored = loadWithMigrations(
  serializeWithVersion({
    stateVersion: CURRENT_STATE_VERSION,
    outposts: [outpost],
    gases: { cryogen: 7, deuterium: 21 },
    assaultingOutpostId: "b1",
  }),
);

assert.deepEqual(
  restored?.outposts?.[0],
  outpost,
  "постройка изменилась после сохранения и загрузки",
);
assert.deepEqual(restored?.gases, { cryogen: 7, deuterium: 21 }, "газ потерялся");
assert.equal(
  restored?.assaultingOutpostId,
  "b1",
  "пометка о штурме не пережила загрузку — победа не вернёт постройку",
);

// ── Ни одно поле типа не должно теряться молча ─────────────────────────────
// Список полей берётся из самого типа: добавили поле и забыли о сейве —
// проверка скажет об этом здесь, а не игрок через неделю
const { readFileSync } = await import("node:fs");
const typeSource = readFileSync(
  new URL("../src/game/types/outposts.ts", import.meta.url),
  "utf8",
);
const declared = [
  ...typeSource
    .slice(
      typeSource.indexOf("export interface Outpost {"),
      typeSource.indexOf("}", typeSource.indexOf("export interface Outpost {")),
    )
    .matchAll(/^\s{4}(\w+)\??:/gm),
].map(([, name]) => name);

assert.ok(declared.length >= 8, `разбор полей Outpost сломался: ${declared}`);
for (const field of declared) {
  assert.ok(
    field in outpost,
    `поле «${field}» появилось в типе Outpost, но не проверяется на сохранение`,
  );
}

console.log("Outpost save checks passed");
console.log(`  ${declared.length} полей постройки переживают круг, миграция до v${CURRENT_STATE_VERSION} работает`);
