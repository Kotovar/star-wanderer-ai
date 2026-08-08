import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import { registerHooks } from "node:module";
import { dirname, extname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import ts from "typescript";

/**
 * Рендерит списки заданий и убеждается, что ни один тип контракта не протекает
 * в интерфейс сырым ключом перевода или неподставленным плейсхолдером.
 * Именно так ломались crisis_response и fabrication: `contracts.desc_fabrication`
 * в заголовке и `{{weapon}}` в тексте предложения.
 */

const sourceFile = (base) =>
  [base, `${base}.ts`, `${base}.tsx`, resolve(base, "index.ts")].find(
    (candidate) => existsSync(candidate) && statSync(candidate).isFile(),
  );

const storeFixture = `
export const useGameStore = Object.assign(
  (selector) => selector(globalThis.__contractLabelState),
  {
    getState: () => globalThis.__contractLabelState,
    setState: () => {},
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

const { createElement } = await import("react");
const { renderToStaticMarkup } = await import("react-dom/server");
const { ContractsList } = await import(
  "../src/game/components/ContractsList.tsx"
);

const FABRICATION = {
  id: "c-fab",
  type: "fabrication",
  desc: "contracts.desc_fabrication",
  reward: 900,
  requiredWeaponType: "drones",
  sourcePlanetId: "p1",
  sourcePlanetName: "Церера-3",
  sourceSectorName: "Меридиан-1",
  sourceDominantRace: "human",
};

const CRISIS_RESPONSE = {
  id: "c-crisis",
  type: "crisis_response",
  desc: "contracts.desc_crisis_response",
  reward: 1200,
  cargo: "medicine",
  quantity: 16,
  crisisId: "epidemic",
  crisisName: "crises.epidemic.name",
  sourcePlanetId: "p1",
  sourcePlanetName: "Церера-3",
  sourceSectorName: "Меридиан-1",
  sourceDominantRace: "human",
};

globalThis.__contractLabelState = {
  activeContracts: [FABRICATION, CRISIS_RESPONSE],
  completedContractIds: [],
  cancelContract: () => {},
  turn: 5,
  addLog: () => {},
  ship: { cargo: [], tradeGoods: [] },
  raceReputation: {},
  artifacts: [],
  research: { researchedTechs: [], unlockedRecipes: ["drones"] },
  galaxy: { sectors: [] },
  activeCrisis: { id: "epidemic", turnsRemaining: 20 },
  completedLocations: [],
};

const markup = renderToStaticMarkup(createElement(ContractsList));

// ── Ни сырых ключей, ни неподставленных плейсхолдеров ───────────────────────
assert.doesNotMatch(
  markup,
  /contracts\.(desc|name|type)_/,
  "сырой ключ перевода протёк в список заданий",
);
assert.doesNotMatch(
  markup,
  /\{\{\w+\}\}/,
  "неподставленный плейсхолдер протёк в список заданий",
);
assert.doesNotMatch(markup, /crises\.\w+\.name/, "имя кризиса не переведено");

// ── Оба типа реально отрисовались под своими именами ────────────────────────
assert.ok(
  markup.includes("Боевые дроны"),
  "заказ на изготовление обязан называть нужное орудие",
);
assert.ok(
  markup.includes("Медикаменты"),
  "отклик на кризис обязан называть нужный груз",
);

// ── И то же самое на английском: имена не должны застревать по-русски ───────
globalThis.localStorage ??= { getItem: () => null, setItem: () => {} };
const { store: i18nStore } = await import("../src/lib/useTranslation.ts");
i18nStore.changeLanguage("en");
// Английский каталог грузится отдельным чанком — дождёмся его
await new Promise((done) => setTimeout(done, 0));
assert.equal(
  i18nStore.t("weapon_types.drones"),
  "Combat Drones",
  "английский каталог не загрузился — проверка была бы бессмысленной",
);
const englishMarkup = renderToStaticMarkup(createElement(ContractsList));
assert.doesNotMatch(
  englishMarkup,
  /[А-Яа-яЁё]/,
  "русские названия протекли в английский интерфейс",
);
assert.ok(
  englishMarkup.includes("Combat Drones"),
  "оружие обязано называться по-английски",
);
assert.ok(
  englishMarkup.includes("Medicine"),
  "груз помощи обязан называться по-английски",
);
i18nStore.changeLanguage("ru");

// ── Прогресс виден: в списке он рисуется полосой, ширина = доля выполнения ──
const bars = (html) => [...html.matchAll(/width:\s*([\d.]+)%/g)].map((m) => m[1]);
assert.deepEqual(
  bars(markup),
  ["0", "0"],
  "пустой трюм обязан давать нулевой прогресс обоим заданиям",
);

// ── С готовым предметом в трюме прогресс закрывается, появляется метка ──────
globalThis.__contractLabelState.ship = {
  cargo: [
    {
      item: "crafted_weapon_drones",
      quantity: 1,
      isCraftedWeapon: true,
      weaponType: "drones",
    },
  ],
  tradeGoods: [{ item: "medicine", quantity: 16 }],
};
const readyMarkup = renderToStaticMarkup(createElement(ContractsList));
assert.deepEqual(
  bars(readyMarkup),
  ["100", "100"],
  "собранное орудие и гружёные медикаменты обязаны закрывать прогресс",
);
assert.equal(
  (readyMarkup.match(/contracts\.ready_badge|ГОТОВО|READY/gi) ?? []).length > 0,
  true,
  "готовое задание обязано получать метку готовности",
);

// ── Все типы контрактов имеют человеческое имя, а не ключ ───────────────────
const contractTypesSource = readFileSync(
  new URL("../src/game/types/contracts.ts", import.meta.url),
  "utf8",
);
const declaredTypes = contractTypesSource
  .slice(contractTypesSource.indexOf("export type ContractType"))
  .split(";")[0]
  .match(/"([a-z_]+)"/g)
  .map((quoted) => quoted.replaceAll('"', ""));
const listSource = readFileSync(
  new URL("../src/game/components/ContractsList.tsx", import.meta.url),
  "utf8",
);
const statusSwitch = listSource.slice(
  listSource.indexOf("const getStatusText"),
  listSource.indexOf("const getContractDetails"),
);
for (const type of declaredTypes) {
  assert.ok(
    statusSwitch.includes(`case "${type}"`),
    `${type} не назван в getStatusText — в списке заданий покажется сырой ключ`,
  );
}

console.log("Contract label checks passed");
