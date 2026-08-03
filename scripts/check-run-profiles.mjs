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
const { ensureDiplomaticStation, ensureStationTypes } = await import("../src/game/galaxy/ensure.ts");

const count = (sectors, type) => sectors.flatMap((sector) => sector.locations).filter((location) => location.type === type).length;
const hasStation = (sectors, tier, stationType) =>
  sectors.some((sector) => sector.tier === tier && sector.locations.some(
    (location) => location.type === "station" && location.stationType === stationType,
  ));
const tierLocations = (sectors, tier, type) =>
  sectors.filter((sector) => sector.tier === tier)
    .flatMap((sector) => sector.locations)
    .filter((location) => location.type === type).length;

const withConstantRandom = (value, callback) => {
  const originalRandom = Math.random;
  Math.random = () => value;
  try {
    return callback();
  } finally {
    Math.random = originalRandom;
  }
};
const makeTier1Anchors = (stationType) => [0, 1, 2].map((id) => ({
  id,
  tier: 1,
  star: { type: "red_dwarf", name: "star_types.red_dwarf" },
  locations: [{ id: `${id}-station`, type: "station", stationType }],
}));

const baselineStart = withConstantRandom(0.6, () => generateGalaxy()[0]);
const warStart = withConstantRandom(0.6, () => generateGalaxy(RUN_PROFILES.war_spiral)[0]);
assert.equal(
  warStart.locations.filter((location) => location.type === "enemy").length,
  baselineStart.locations.filter((location) => location.type === "enemy").length,
  "war_spiral: start sector must keep baseline hostile locations",
);

for (const stationType of ["shipyard", "medical"]) {
  const sectors = makeTier1Anchors(stationType);
  ensureStationTypes(sectors, 1);
  ensureDiplomaticStation(sectors);
  assert.deepEqual(
    sectors.flatMap((sector) => sector.locations).map((location) => location.stationType).sort(),
    ["diplomatic", "medical", "shipyard"],
    `broken_trade_lanes: ${stationType}-only anchors must provide all tier-1 services`,
  );
}

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
    for (const tier of [1, 2, 3]) {
      if (profile.id === "ancient_echo") {
        const richSectors = sectors.filter((sector) => sector.tier === tier)
          .filter((sector) => sector.locations.filter((location) => location.type === "anomaly").length >= 3);
        assert.ok(richSectors.length >= 2, `ancient_echo: tier ${tier} needs two anomaly clusters`);
      }
      if (profile.id === "war_spiral") {
        const warfronts = sectors.filter((sector) => sector.tier === tier && sector.id !== 0)
          .filter((sector) => sector.locations.some((location) => location.type === "enemy"))
          .filter((sector) => sector.locations.filter((location) => location.type === "space_monster").length >= 2);
        assert.ok(warfronts.length >= 2, `war_spiral: tier ${tier} needs two warfronts`);
      }
      if (profile.id === "broken_trade_lanes") {
        for (const type of ["derelict_ship", "distress_signal", "wreck_field"]) {
          assert.ok(tierLocations(sectors, tier, type) >= 2, `broken_trade_lanes: tier ${tier} needs ${type}`);
        }
      }
    }

    if (profile.id === "broken_trade_lanes") {
      const expectedStations = { 1: 3, 2: 2, 3: 2, 4: 2 };
      for (const [tier, expected] of Object.entries(expectedStations)) {
        assert.equal(tierLocations(sectors, Number(tier), "station"), expected);
      }
    }
  }
}

console.log("Run profile checks passed");
