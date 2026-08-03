import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";
import path from "node:path";

const require = createRequire(import.meta.url);
const scriptPath = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(scriptPath), "..");
const jiti = require("jiti")(scriptPath, {
  alias: { "@": path.join(root, "src") },
});

const {
  routeIntersectsNebula,
  findRouteNebula,
  generateNebulae,
  getSectorMapPoint,
} = jiti("../src/game/galaxy/nebulae.ts");
const { generateGalaxy } = jiti("../src/game/galaxy/generateGalaxy.ts");
const { loadWithMigrations } = jiti("../src/game/saves/migrations.ts");
const { rollNebulaDisruption, getNebulaDisruptionPatch } =
  jiti("../src/game/slices/travel/helpers/nebulaHazards.ts");

const origin = {
  id: 0,
  tier: 1,
  mapAngle: Math.PI,
  locations: [],
  star: { type: "red_dwarf" },
};
const destination = {
  id: 1,
  tier: 1,
  mapAngle: 0,
  locations: [],
  star: { type: "red_dwarf" },
};
const offRoute = { id: "off-route", x: 0, y: 0.72, radius: 0.08 };
const crossing = { id: "crossing", x: 0, y: 0, radius: 0.2 };

assert.equal(
  routeIntersectsNebula(origin, destination, crossing),
  true,
  "a segment through the circle centre must cross the nebula",
);
assert.equal(
  routeIntersectsNebula(origin, destination, offRoute),
  false,
  "a distant circle must not be reported as a route hazard",
);
assert.equal(
  findRouteNebula(origin, destination, [offRoute, crossing])?.id,
  "crossing",
  "the first crossing nebula must be returned for the direct route",
);
assert.equal(
  routeIntersectsNebula(origin, origin, {
    id: "at-origin",
    x: -0.38,
    y: 0,
    radius: 0.01,
  }),
  true,
  "a zero-length route must be hazardous when its sector is inside the nebula",
);

const sameTierA = { ...origin, id: 4, tier: 2, mapAngle: Math.PI };
const sameTierB = { ...destination, id: 5, tier: 2, mapAngle: 0 };
assert.equal(
  routeIntersectsNebula(sameTierA, sameTierB, crossing),
  true,
  "a same-tier direct route must still detect a nebula crossing",
);

assert.equal(
  rollNebulaDisruption(() => 0.61),
  null,
  "a roll outside the 60% nebula chance must have no disruption",
);
assert.equal(
  rollNebulaDisruption(() => 0),
  "fuel_loss",
  "a successful low roll must select the first disruption",
);
assert.equal(
  rollNebulaDisruption((() => {
    const rolls = [0, 0.5];
    return () => rolls.shift();
  })()),
  "module_damage",
  "the second roll must choose the disruption type",
);

const traveling = {
  destination,
  turnsLeft: 2,
  turnsTotal: 2,
  route: "direct",
  nebulaId: "n",
  nebulaChecked: false,
};
const baseState = {
  traveling,
  ship: {
    fuel: 20,
    modules: [
      { id: 1, health: 100, disabled: false },
      { id: 2, health: 10, disabled: false },
      { id: 3, health: 100, disabled: true },
      { id: 4, health: 100, manualDisabled: true },
    ],
  },
};
assert.equal(
  getNebulaDisruptionPatch(baseState, "fuel_loss", () => 0)?.ship.fuel,
  12,
  "fuel loss must remove exactly eight fuel",
);
const moduleDamage = getNebulaDisruptionPatch(
  baseState,
  "module_damage",
  () => 0,
);
assert.equal(
  moduleDamage?.ship.modules[0].health,
  85,
  "module damage must damage one eligible module by fifteen",
);
assert.equal(
  moduleDamage?.ship.modules[1].health,
  10,
  "modules at minimum health must not be selected",
);
assert.equal(
  moduleDamage?.ship.modules[2].health,
  100,
  "disabled modules must not be selected",
);
assert.equal(
  moduleDamage?.ship.modules[3].health,
  100,
  "manually disabled modules must not be selected",
);
assert.deepEqual(
  Object.keys(moduleDamage ?? {}).sort(),
  ["ship", "traveling"],
  "a nebula disruption must not add rewards or other state",
);
assert.equal(
  getNebulaDisruptionPatch(baseState, "drift", () => 0)?.traveling?.turnsLeft,
  3,
  "drift must add exactly one travel turn",
);
assert.equal(
  getNebulaDisruptionPatch(
    { ...baseState, traveling: { ...traveling, nebulaChecked: true } },
    "fuel_loss",
    () => 0,
  ),
  null,
  "an already checked nebula must not disrupt travel again",
);

const selectSectorSource = readFileSync(
  path.resolve(process.cwd(), "src/game/slices/travel/helpers/selectSector.ts"),
  "utf8",
);
assert.match(selectSectorSource, /findRouteNebula/);
assert.match(selectSectorSource, /route === "direct" && !hasWarpDrive/);
assert.match(selectSectorSource, /travelTurns = Math\.max\(1, travelTurns\)/);
assert.match(
  selectSectorSource,
  /const travelInstant = hasWarpDrive \|\| \(fuelResult\.travelInstant && !crossedNebula\);/,
  "a warp coil must not make a nebula crossing instant; only warp drive is exempt",
);

const galaxyMapSource = readFileSync(
  path.resolve(process.cwd(), "src/game/components/GalaxyMap.tsx"),
  "utf8",
);
assert.match(galaxyMapSource, /findRouteNebula/);
assert.match(galaxyMapSource, /drawNebulae/);

const ru = JSON.parse(
  readFileSync(path.resolve(process.cwd(), "src/lib/locales/ru.json"), "utf8"),
);
const en = JSON.parse(
  readFileSync(path.resolve(process.cwd(), "src/lib/locales/en.json"), "utf8"),
);
assert.equal(
  ru.galaxy_map_ui.nebula.route_warning,
  "Маршрут проходит через туманность",
);
assert.equal(
  en.galaxy_map_ui.nebula.route_warning,
  "Route crosses a nebula",
);

const progressionDoc = readFileSync(
  path.resolve(process.cwd(), "docs/CAMPAIGN_PROGRESSION.md"),
  "utf8",
);
assert.match(progressionDoc, /## Туманности/);
assert.match(progressionDoc, /в обход/);

const hazardSource = readFileSync(
  path.resolve(
    process.cwd(),
    "src/game/slices/travel/helpers/nebulaHazards.ts",
  ),
  "utf8",
);
assert.doesNotMatch(hazardSource, /credits|research|cargo/i);

const withSeededRandom = (callback) => {
  const originalRandom = Math.random;
  let seed = 123_456_789;
  Math.random = () => {
    seed = (seed * 1_664_525 + 1_013_904_223) >>> 0;
    return seed / 2 ** 32;
  };
  try {
    return callback();
  } finally {
    Math.random = originalRandom;
  }
};
const { sectors, generated } = withSeededRandom(() => {
  const generatedSectors = generateGalaxy();
  return {
    sectors: generatedSectors,
    generated: generateNebulae(generatedSectors),
  };
});
assert.equal(generated.length, 1, "a normal generated galaxy must contain one nebula");
const [nebula] = generated;
assert.ok(
  sectors.some((sector) => sector.id === 0),
  "the generated galaxy must include its protected starting sector",
);
for (const bossId of ["void_oracle", "the_eternal"]) {
  assert.ok(
    sectors.some((sector) =>
      sector.locations.some((location) => location.bossId === bossId),
    ),
    `the generated galaxy must include protected boss ${bossId}`,
  );
}
const protectedSectors = sectors.filter(
  (sector) =>
    sector.id === 0 ||
    sector.locations.some(
      (location) =>
        location.bossId === "void_oracle" || location.bossId === "the_eternal",
    ),
);
for (const sector of protectedSectors) {
  const point = getSectorMapPoint(sector);
  assert.ok(
    (point.x - nebula.x) ** 2 + (point.y - nebula.y) ** 2 > nebula.radius ** 2,
    `protected sector ${sector.id} must stay outside the nebula`,
  );
}

const migrated = loadWithMigrations(
  JSON.stringify({ version: 20, state: { galaxy: { sectors: [] } } }),
);
assert.deepEqual(
  migrated?.galaxy.nebulae,
  [],
  "version 20 saves must receive an empty nebula list during migration",
);

console.log("Nebula hazard checks passed");
