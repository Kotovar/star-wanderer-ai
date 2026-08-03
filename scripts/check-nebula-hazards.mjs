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

const {
  routeIntersectsNebula,
  findRouteNebula,
  generateNebulae,
  getSectorMapPoint,
} = jiti("../src/game/galaxy/nebulae.ts");
const { generateGalaxy } = jiti("../src/game/galaxy/generateGalaxy.ts");
const { loadWithMigrations } = jiti("../src/game/saves/migrations.ts");

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
