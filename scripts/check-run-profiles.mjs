import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import { registerHooks } from "node:module";
import { dirname, extname, resolve } from "node:path";
import ts from "typescript";
import { fileURLToPath, pathToFileURL } from "node:url";

const sourceFile = (base) =>
  [base, `${base}.ts`, `${base}.tsx`, resolve(base, "index.ts"), resolve(base, "index.tsx")]
    .find((candidate) => existsSync(candidate) && statSync(candidate).isFile());

registerHooks({
  resolve(specifier, context, nextResolve) {
    const parent = context.parentURL ? dirname(fileURLToPath(context.parentURL)) : process.cwd();
    const base = specifier.startsWith("@/")
      ? resolve(process.cwd(), "src", specifier.slice(2))
      : specifier.startsWith(".") && !extname(specifier)
        ? resolve(parent, specifier)
        : null;
    const file = base ? sourceFile(base) : null;
    return file ? { url: pathToFileURL(file).href, shortCircuit: true } : nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (!url.endsWith(".ts") && !url.endsWith(".tsx")) return nextLoad(url, context);
    return {
      format: "module",
      source: ts.transpileModule(readFileSync(fileURLToPath(url), "utf8"), {
        compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
      }).outputText,
      shortCircuit: true,
    };
  },
});

const { RUN_PROFILES } = await import("../src/game/galaxy/runProfiles.ts");
const { generateGalaxy } = await import("../src/game/galaxy/generateGalaxy.ts");

const count = (sectors, type) => sectors.flatMap((sector) => sector.locations).filter((location) => location.type === type).length;
const hasStation = (sectors, tier, stationType) =>
  sectors.some((sector) => sector.tier === tier && sector.locations.some(
    (location) => location.type === "station" && location.stationType === stationType,
  ));

for (const profile of Object.values(RUN_PROFILES)) {
  for (let run = 0; run < 12; run += 1) {
    const sectors = generateGalaxy(profile);
    assert.ok(sectors[0]?.locations.length, `${profile.id}: the start must contain choices`);
    assert.ok(sectors.filter((sector) => sector.star.type === "blackhole").length >= 2);
    assert.equal(count(sectors, "boss") && sectors.flatMap((s) => s.locations).filter((l) => l.bossId === "void_oracle").length, 1);
    assert.equal(sectors.flatMap((s) => s.locations).filter((l) => l.bossId === "the_eternal").length, 1);
    for (const tier of [1, 2, 3, 4]) {
      assert.ok(hasStation(sectors, tier, "shipyard"), `${profile.id}: tier ${tier} needs repair`);
      assert.ok(hasStation(sectors, tier, "medical"), `${profile.id}: tier ${tier} needs healing`);
    }
  }
}

console.log("Run profile checks passed");
