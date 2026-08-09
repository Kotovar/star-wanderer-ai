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

const { formatResearchTechRequirement } = jiti(
  "../src/game/contracts/formatContractDescription.ts",
);
const ru = JSON.parse(
  readFileSync(new URL("../src/lib/locales/ru.json", import.meta.url), "utf8"),
);
const en = JSON.parse(
  readFileSync(new URL("../src/lib/locales/en.json", import.meta.url), "utf8"),
);
const translator = (catalog) => (key) =>
  key.split(".").reduce((value, part) => value?.[part], catalog) ?? key;

assert.equal(
  typeof formatResearchTechRequirement,
  "function",
  "technology contracts must share one literary tier formatter",
);

for (const [tier, expectedRu, expectedEn] of [
  [
    1,
    "Завершить исследование технологии начального уровня",
    "Complete research of a basic technology",
  ],
  [
    2,
    "Завершить исследование технологии продвинутого уровня",
    "Complete research of an advanced technology",
  ],
  [
    3,
    "Завершить исследование технологии элитного уровня",
    "Complete research of an elite technology",
  ],
  [
    4,
    "Завершить исследование технологии элитного уровня",
    "Complete research of an elite technology",
  ],
]) {
  assert.equal(formatResearchTechRequirement(tier, translator(ru)), expectedRu);
  assert.equal(formatResearchTechRequirement(tier, translator(en)), expectedEn);
}

console.log("Contract technology tier copy checks passed");
