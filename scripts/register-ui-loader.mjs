/**
 * То же, что `register-ts-loader.mjs`, плюс заглушка стора: `@/game/store`
 * и `../store` резолвятся в фикстуру, читающую `globalThis.__uiState`.
 * Нужен скриптам, которые рендерят компоненты и проверяют, что видит игрок,
 * а не что посчитал хелпер — расчёт может быть верным, а показ нет.
 *
 * Использование:
 *   import { setUiState } from "./register-ui-loader.mjs";
 *   setUiState({ crew: [], ... });
 *   const { Component } = await import("../src/game/components/X.tsx");
 */
import { existsSync, readFileSync, statSync } from "node:fs";
import { registerHooks } from "node:module";
import { dirname, extname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import ts from "typescript";

const sourceFile = (base) =>
  [base, `${base}.ts`, `${base}.tsx`, resolve(base, "index.ts")].find(
    (candidate) => existsSync(candidate) && statSync(candidate).isFile(),
  );

// Пустой объект по умолчанию, а не undefined: компонент может читать стор
// раньше, чем проверка успела позвать setUiState, и селектор не обязан
// падать на этом — он должен получить состояние без нужных полей
const storeFixture = `
export const useGameStore = Object.assign(
  (selector) => selector(globalThis.__uiState ?? {}),
  {
    getState: () => globalThis.__uiState ?? {},
    setState: () => {},
    subscribe: () => () => {},
  },
);`;
const imageFixture = "export default function Image() { return null; }";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "next/image") {
      return {
        url: `data:text/javascript,${encodeURIComponent(imageFixture)}`,
        shortCircuit: true,
      };
    }
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

globalThis.localStorage ??= { getItem: () => null, setItem: () => {} };

/** Подменяет состояние, которое увидит следующий рендер. */
export function setUiState(state) {
  globalThis.__uiState = state;
  return state;
}

/** Дописывает поля к текущему состоянию, не пересобирая его целиком. */
export function patchUiState(patch) {
  return setUiState({ ...globalThis.__uiState, ...patch });
}
