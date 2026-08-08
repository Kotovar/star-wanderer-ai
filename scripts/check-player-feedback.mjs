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

console.log("Player feedback checks passed");
