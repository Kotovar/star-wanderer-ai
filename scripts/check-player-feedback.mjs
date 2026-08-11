import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import { registerHooks } from "node:module";
import { dirname, extname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import ts from "typescript";

const sourceFile = (base) =>
  [base, `${base}.ts`, `${base}.tsx`, resolve(base, "index.ts")].find(
    (candidate) => existsSync(candidate) && statSync(candidate).isFile(),
  );
const storeFixture = `
export const useGameStore = Object.assign(
  (selector) => selector(globalThis.__playerFeedbackState),
  {
    getState: () => globalThis.__playerFeedbackState,
    setState: (update) => Object.assign(
      globalThis.__playerFeedbackState,
      typeof update === "function"
        ? update(globalThis.__playerFeedbackState)
        : update,
    ),
    subscribe: () => () => {},
  },
);`;

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "@/game/store" || specifier === "../store") {
      return {
        url: `data:text/javascript,${encodeURIComponent(storeFixture)}`,
        shortCircuit: true,
      };
    }
    const parent = context.parentURL
      ? dirname(fileURLToPath(context.parentURL))
      : process.cwd();
    const base = specifier.startsWith("@/")
      ? resolve(process.cwd(), "src", specifier.slice(2))
      : specifier.startsWith(".") && !extname(specifier)
        ? resolve(parent, specifier)
        : null;
    const file = base ? sourceFile(base) : null;
    return file
      ? { url: pathToFileURL(file).href, shortCircuit: true }
      : nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (url.endsWith(".json")) {
      return {
        format: "module",
        source: `export default ${readFileSync(fileURLToPath(url), "utf8")};`,
        shortCircuit: true,
      };
    }
    if (url.endsWith(".ts") || url.endsWith(".tsx")) {
      return {
        format: "module",
        source: ts.transpileModule(readFileSync(fileURLToPath(url), "utf8"), {
          compilerOptions: {
            module: ts.ModuleKind.ESNext,
            target: ts.ScriptTarget.ES2022,
            jsx: ts.JsxEmit.ReactJSX,
          },
          fileName: fileURLToPath(url),
        }).outputText,
        shortCircuit: true,
      };
    }
    return nextLoad(url, context);
  },
});

const occurrences = (value, token) => value.split(token).length - 1;
const { createElement } = await import("react");
const { renderToStaticMarkup } = await import("react-dom/server");
const { AsteroidBeltPanel } = await import(
  "../src/game/components/AsteroidBeltPanel.tsx"
);
const { FriendlyShipPanel } = await import(
  "../src/game/components/FriendlyShipPanel.tsx"
);
const { GasSaleSection } = await import(
  "../src/game/components/station/GasSaleSection.tsx"
);
const ru = JSON.parse(
  readFileSync(new URL("../src/lib/locales/ru.json", import.meta.url), "utf8"),
);

globalThis.__playerFeedbackState = {
  currentLocation: {
    id: "asteroid-test",
    type: "asteroid_belt",
    name: "Тестовый астероид",
    mined: true,
    asteroidTier: 1,
    miningResult: {
      minerals: 0,
      rare: 0,
      credits: 0,
      researchResources: ["💠 Квантовые кристаллы x1"],
      cargoWarning: "⚠️ Нет места в грузовом отсеке! Ресурсы потеряны.",
    },
  },
  crew: [{ profession: "engineer" }],
  ship: { cargo: [], tradeGoods: [] },
  probes: 0,
  getCargoCapacity: () => 10,
  getDrillLevel: () => 1,
  getEffectiveScanRange: () => 5,
  mineAsteroid: () => {},
  showSectorMap: () => {},
};

const asteroidMarkup = renderToStaticMarkup(createElement(AsteroidBeltPanel));
assert.equal(
  occurrences(asteroidMarkup, "💎") + occurrences(asteroidMarkup, "💠"),
  1,
  "результат бурения должен показывать одну иконку исследовательского ресурса",
);
assert.equal(
  occurrences(asteroidMarkup, "⚠"),
  1,
  "предупреждение о заполненном трюме должно показывать одну иконку",
);

globalThis.__playerFeedbackState.currentLocation = {
  id: "asteroid-test",
  type: "asteroid_belt",
  name: "Тестовый астероид",
  mined: false,
  asteroidTier: 1,
};
globalThis.__playerFeedbackState.getDrillLevel = () => 0;
const noDrillMarkup = renderToStaticMarkup(createElement(AsteroidBeltPanel));
assert.ok(
  noDrillMarkup.includes(ru.game_logs.mineAsteroid_no_drill),
  "без бура пояс должен предлагать установить буровой модуль",
);
assert.equal(
  noDrillMarkup.includes(ru.asteroid_belt.drill_destroyed),
  false,
  "отсутствующий бур не должен называться сломанным",
);

for (const [locale, expected] of [
  ["ru", "Получены исследовательские ресурсы: 💠 Квантовые кристаллы x1"],
  ["en", "Research resources received: 💠 Quantum crystals x1"],
]) {
  const catalog = JSON.parse(
    readFileSync(
      new URL(`../src/lib/locales/${locale}.json`, import.meta.url),
      "utf8",
    ),
  );
  assert.equal(
    catalog.game_logs.mineAsteroid_7.replace(
      "{{label}}",
      locale === "ru"
        ? "💠 Квантовые кристаллы x1"
        : "💠 Quantum crystals x1",
    ),
    expected,
  );
}

const deliveryState = {
  currentSector: { tier: 1 },
  currentLocation: {
    id: "delivery-ship",
    type: "friendly_ship",
    name: "Курьер",
    hasTrader: false,
    hasCrew: false,
    hasQuest: false,
    hasDistress: false,
  },
  credits: 0,
  probes: 0,
  ship: {
    modules: [],
    cargo: [
      {
        item: "construction_materials",
        quantity: 10,
        contractId: "delivery-1",
      },
    ],
    tradeGoods: [],
    fuel: 0,
  },
  crew: [],
  knownRaces: [],
  raceReputation: {},
  activeContracts: [
    {
      id: "delivery-1",
      type: "delivery",
      targetLocationId: "delivery-ship",
      cargo: "construction_materials",
      quantity: 10,
      reward: 250,
      desc: "Тестовая доставка",
    },
  ],
  shipQuestsTaken: [],
  hiredCrewFromShips: [],
  friendlyShipStock: { "delivery-ship": {} },
  distressRespondedShips: [],
  discoverRace: () => {},
  hireCrew: () => false,
  getCrewCapacity: () => 5,
  acceptContract: () => false,
  completeDeliveryContract: () => {},
  showSectorMap: () => {},
  attackFriendlyShip: () => {},
  addLog: () => {},
};
globalThis.__playerFeedbackState = deliveryState;

const deliveryMarkup = renderToStaticMarkup(createElement(FriendlyShipPanel));
assert.ok(
  deliveryMarkup.includes(ru.delivery_goods.construction_materials),
  "доставка должна показывать локализованное название груза",
);
assert.equal(deliveryMarkup.includes("construction_materials"), false);

deliveryState.activeContracts[0].cargo = "legacy_payload";
const legacyDeliveryMarkup = renderToStaticMarkup(
  createElement(FriendlyShipPanel),
);
assert.ok(
  legacyDeliveryMarkup.includes("legacy_payload"),
  "неизвестный груз должен сохранить legacy-значение",
);

globalThis.__playerFeedbackState = {
  gases: { polymers: 2 },
  credits: 1_000,
  sellGas: () => {},
  buyGas: () => {},
};

const gasTradeMarkup = renderToStaticMarkup(createElement(GasSaleSection));
for (const label of [
  "Продать 1",
  "Продать всё",
  "+1 · 70₢",
  "+5 · 350₢",
  "+10 · 700₢",
]) {
  assert.ok(
    gasTradeMarkup.includes(label),
    `торговля газом не показывает действие «${label}»`,
  );
}

const contractsList = readFileSync("src/game/components/ContractsList.tsx", "utf8");
assert.match(contractsList, /getLocationName\(contract\.sourceName, t\)/);
assert.equal(
  ru.random_events.consequence.trader.specialist.includes("Recommend"),
  false,
  "trader consequence must not contain an untranslated fragment",
);

const gasGiant = readFileSync("src/game/components/GasGiantPanel.tsx", "utf8");
assert.match(gasGiant, /overflow-y-auto scrollbar-gutter-stable rounded-lg/);
assert.equal(
  (gasGiant.match(/disabled=\{Boolean\(activeDive\.currentEvent\)\}/g) ?? []).length,
  2,
  "both dive controls remain mounted and disabled during a decision",
);

console.log("Player feedback checks passed");
