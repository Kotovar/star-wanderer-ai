import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const require = createRequire(import.meta.url);
const scriptPath = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(scriptPath), "..");
const jiti = require("jiti")(scriptPath, {
  alias: { "@": path.join(root, "src") },
});

const { generateGalaxy } = jiti("../src/game/galaxy/generateGalaxy.ts");
const { getSectorName, getSectorNames } = jiti("../src/lib/translationHelpers.ts");
const { store } = jiti("../src/lib/useTranslation.ts");

const readLocale = (locale) =>
  JSON.parse(readFileSync(path.join(root, "src", "lib", "locales", `${locale}.json`), "utf8"));

const createTranslator = (locale) => (key) =>
  key.split(".").reduce(
    (value, part) =>
      value && typeof value === "object" && part in value ? value[part] : undefined,
    locale,
  ) ?? key;

const ru = createTranslator(readLocale("ru"));
const en = createTranslator(readLocale("en"));
const sectors = generateGalaxy();

assert.equal(sectors.length, 42, "the galaxy contains the configured 42 sectors");
assert.equal(
  new Set(sectors.map((sector) => sector.name)).size,
  42,
  "each generated sector has a unique stored name key",
);

for (const sector of sectors) {
  assert.match(
    sector.name,
    /^sector_names\./,
    "new sectors store a localizable name key",
  );

  for (const [language, translate] of [["RU", ru], ["EN", en]]) {
    const name = getSectorName(sector.name, translate);
    assert.notEqual(name, sector.name, `${language} resolves the sector key`);
    assert.ok(
      name.endsWith(`-${sector.tier}`),
      `${language} sector name shows its tier suffix`,
    );
  }
}

for (const [language, translate] of [["RU", ru], ["EN", en]]) {
  assert.equal(
    new Set(sectors.map((sector) => getSectorName(sector.name, translate))).size,
    sectors.length,
    `${language} has a distinct name for every sector`,
  );
}

assert.equal(
  getSectorName("Альфа-1", ru),
  "Альфа-1",
  "legacy literal sector names remain readable",
);

const storeTranslatedName = getSectorName("sector_names.sector_01_1", store.t);
assert.notEqual(
  storeTranslatedName,
  "sector_names.sector_01_1",
  "the store translator remains callable when passed to a sector formatter",
);

const contractSectorNames = getSectorNames(
  "sector_names.sector_01_1, sector_names.sector_13_2",
  en,
);
assert.notEqual(
  contractSectorNames,
  "sector_names.sector_01_1, sector_names.sector_13_2",
  "contract sector lists resolve every sector key",
);
assert.match(
  contractSectorNames,
  /-1, .+-2$/,
  "contract sector lists preserve tier suffixes",
);

console.log("Sector name checks passed");
