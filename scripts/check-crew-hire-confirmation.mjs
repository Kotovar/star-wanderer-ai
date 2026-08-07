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
const { getOxygenHireWarning } = jiti(
  "../src/game/slices/crewManagement/utils/hireCrew.ts",
);
const { CREW_TRAITS } = jiti("../src/game/constants/traits.ts");
const ru = require("../src/lib/locales/ru.json");
const en = require("../src/lib/locales/en.json");

const crew = Array.from({ length: 5 }, () => ({ race: "human" }));
const state = {
  crew,
  getOxygenCapacity: () => 5,
};

assert.deepEqual(
  getOxygenHireWarning(state, "human"),
  { status: "oxygen_confirmation_required", needed: 6, capacity: 5 },
  "An organic hire over capacity must require explicit confirmation",
);
assert.equal(
  getOxygenHireWarning(state, "synthetic"),
  null,
  "An oxygen-immune hire must not require confirmation",
);
assert.equal(
  CREW_TRAITS.mutation.find(({ id }) => id === "regeneration")?.name,
  "Мутация: Клеточное восстановление",
  "The saved mutation id must use its new Russian display name",
);
assert.equal(
  ru.racial_traits.regeneration.name,
  "Мутация: Клеточное восстановление",
);
assert.equal(
  en.racial_traits.regeneration.name, "Mutation: Cellular Recovery");

console.log("Crew hire confirmation checks passed");
