import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import "./register-ts-loader.mjs";

/**
 * Шлюз: выброс груза за борт.
 *
 * Появился из тупика с криогеном — он не продаётся и тратится по единице за
 * ход, поэтому полный трюм криогена был неразрешимой ситуацией на десятки
 * ходов. Раз клапан нужен, он обязан работать для всех групп трюма, иначе
 * тупик просто переедет в другую группу.
 */

const { jettisonCargo, getJettisonMax } = await import(
  "../src/game/slices/ship/helpers/jettison.ts"
);

const makeStore = () => {
  const state = {
    ship: {
      cargo: [
        { item: "medicine_crate", quantity: 4 },
        { item: "crafted_weapon_drones", quantity: 1, isCraftedWeapon: true, weaponType: "drones" },
        { item: "engine", quantity: 2, isModule: true, module: { name: "Двигатель" } },
      ],
      tradeGoods: [
        { item: "minerals", quantity: 10 },
        { item: "water", quantity: 3 },
      ],
      modules: [],
    },
    gases: { cryogen: 12, deuterium: 5 },
    probes: 4,
    logs: [],
  };
  const get = () => store;
  const set = (fn) => Object.assign(state, typeof fn === "function" ? fn(state) : fn);
  const store = {
    ...state,
    addLog: (text) => state.logs.push(text),
    updateShipStats: () => {},
  };
  // Держим ссылки живыми: помощник читает через get(), а пишет через set()
  Object.defineProperties(store, {
    ship: { get: () => state.ship, configurable: true },
    gases: { get: () => state.gases, configurable: true },
    probes: { get: () => state.probes, configurable: true },
  });
  return { store, state, set, get };
};

// ── Все шесть видов груза выбрасываются ────────────────────────────────────
{
  const { store, state, set, get } = makeStore();

  jettisonCargo({ kind: "gas", gas: "cryogen" }, 12, set, get);
  assert.equal(
    state.gases.cryogen,
    undefined,
    "криоген не выбрасывается — тот самый тупик, из-за которого шлюз и появился",
  );
  assert.equal(state.gases.deuterium, 5, "выброс задел чужой газ");

  jettisonCargo({ kind: "trade_good", good: "minerals" }, 10, set, get);
  assert.equal(
    state.ship.tradeGoods.find((g) => g.item === "minerals"),
    undefined,
    "пустая позиция обязана исчезать из трюма, а не висеть нулём",
  );
  assert.equal(state.ship.tradeGoods.length, 1);

  jettisonCargo({ kind: "probes" }, 4, set, get);
  assert.equal(state.probes, 0);

  jettisonCargo({ kind: "cargo", index: 0 }, 4, set, get);
  assert.equal(state.ship.cargo.length, 2, "груз задания не выброшен");
  void store;
}

// ── Частичный выброс: остаток остаётся ─────────────────────────────────────
{
  const { state, set, get } = makeStore();

  jettisonCargo({ kind: "trade_good", good: "minerals" }, 4, set, get);
  assert.equal(
    state.ship.tradeGoods.find((g) => g.item === "minerals").quantity,
    6,
    "частичный выброс обязан оставлять остаток — иначе ползунок бессмысленен",
  );

  jettisonCargo({ kind: "gas", gas: "cryogen" }, 5, set, get);
  assert.equal(state.gases.cryogen, 7);

  jettisonCargo({ kind: "probes" }, 1, set, get);
  assert.equal(state.probes, 3);

  jettisonCargo({ kind: "cargo", index: 2 }, 1, set, get);
  assert.equal(state.ship.cargo[2].quantity, 1, "модуль выброшен целиком вместо одного");
}

// ── Границы: ноль, минус и больше запаса ───────────────────────────────────
{
  const { state, set, get } = makeStore();

  jettisonCargo({ kind: "probes" }, 0, set, get);
  jettisonCargo({ kind: "probes" }, -5, set, get);
  assert.equal(state.probes, 4, "нулевой и отрицательный выброс не должны ничего менять");

  const beforeInvalidQuantity = structuredClone(state);
  jettisonCargo({ kind: "cargo", index: 0 }, Number.NaN, set, get);
  assert.deepEqual(
    state,
    beforeInvalidQuantity,
    "NaN в количестве не должен удалить стек груза или оставить запись в журнале",
  );

  jettisonCargo({ kind: "gas", gas: "deuterium" }, 999, set, get);
  assert.equal(
    state.gases.deuterium,
    undefined,
    "запрос больше запаса обязан выбросить ровно запас, а не уйти в минус",
  );

  jettisonCargo({ kind: "cargo", index: 99 }, 1, set, get);
  assert.equal(state.ship.cargo.length, 3, "несуществующий индекс не должен ничего трогать");

  assert.equal(getJettisonMax(get(), { kind: "probes" }), 4);
  assert.equal(getJettisonMax(get(), { kind: "gas", gas: "cryogen" }), 12);
  assert.equal(getJettisonMax(get(), { kind: "cargo", index: 99 }), 0);
  assert.equal(
    getJettisonMax({ ...get(), gases: undefined }, { kind: "gas", gas: "cryogen" }),
    0,
    "сейв до миграции не должен падать",
  );
}

// ── Каждый выброс попадает в журнал: действие необратимое ───────────────────
{
  const { state, set, get } = makeStore();
  jettisonCargo({ kind: "probes" }, 2, set, get);
  assert.equal(state.logs.length, 1, "выброс обязан оставлять запись в журнале");
}

// ── Интерфейс: подтверждение, ползунок и все группы ────────────────────────
const source = (path) =>
  readFileSync(new URL(`../src/${path}`, import.meta.url), "utf8");

const dialog = source("game/components/JettisonDialog.tsx");
assert.match(dialog, /type="range"/, "нет ползунка количества");
assert.match(
  dialog,
  /jettison_confirm/,
  "нет подтверждения: необратимое действие не должно срабатывать с первого нажатия",
);
assert.match(
  dialog,
  /setConfirming\(entry\.key\)/,
  "первое нажатие обязано только запрашивать подтверждение",
);

// Обе надписи держатся в потоке одной ячейкой грида: иначе кнопка меняет
// ширину при смене состояния и макет прыгает — причём по-разному на разных
// языках, потому что «Выбросить»/«Точно?» и «Jettison»/«Sure?» разной длины
const confirmBlock = dialog.slice(
  dialog.indexOf("jettison_confirm") - 700,
  dialog.indexOf("jettison_action") + 100,
);
assert.match(
  confirmBlock,
  /col-start-1 row-start-1/,
  "надписи кнопки не наложены в одну ячейку — ширина будет прыгать при подтверждении",
);
assert.equal(
  (confirmBlock.match(/visibility: isConfirming/g) ?? []).length,
  2,
  "обе надписи обязаны оставаться в потоке, скрывается только видимость",
);
for (const kind of ['kind: "cargo"', 'kind: "trade_good"', 'kind: "gas"', 'kind: "probes"']) {
  assert.ok(dialog.includes(kind), `шлюз не умеет выбрасывать ${kind}`);
}
assert.match(
  source("game/components/CargoDisplay.tsx"),
  /JettisonDialog/,
  "шлюз не открывается из трюма",
);

// Двух путей выброса быть не должно: газовая кнопка в модалке заменена шлюзом
assert.doesNotMatch(
  source("game/components/CargoDisplay.tsx"),
  /jettisonGas/,
  "остался отдельный выброс газа — теперь это делает шлюз",
);

for (const lang of ["ru", "en"]) {
  const catalog = JSON.parse(
    readFileSync(new URL(`../src/lib/locales/${lang}.json`, import.meta.url), "utf8"),
  );
  for (const key of [
    "jettison_title",
    "jettison_hint",
    "jettison_warning",
    "jettison_action",
    "jettison_confirm",
  ]) {
    assert.ok(catalog.cargo?.[key], `${lang}: нет cargo.${key}`);
  }
  assert.ok(catalog.game_logs?.cargo_jettisoned, `${lang}: нет лога выброса`);
}

console.log("Jettison checks passed");
