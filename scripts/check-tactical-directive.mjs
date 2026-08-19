import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";

const require = createRequire(import.meta.url);
const scriptPath = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(scriptPath), "..");
const jiti = require("jiti")(scriptPath, {
  alias: { "@": path.join(root, "src") },
});
const { getTacticalDirective } = jiti(
  "../src/game/progression/campaignProgress.ts",
);
const [russian, english] = await Promise.all(
  ["ru", "en"].map((locale) =>
    readFile(
      new URL(`../src/lib/locales/${locale}.json`, import.meta.url),
      "utf8",
    ).then(JSON.parse),
  ),
);

assert.equal(
  typeof getTacticalDirective,
  "function",
  "campaign progress exposes a tactical directive selector",
);

const urgentContract = {
  id: "urgent-contract",
  type: "delivery",
  acceptedAt: 5,
  timeLimit: 8,
};
const lessUrgentContract = {
  id: "less-urgent-contract",
  type: "delivery",
  acceptedAt: 6,
  timeLimit: 8,
};
const normalContract = {
  id: "normal-contract",
  type: "delivery",
  acceptedAt: 5,
  timeLimit: 10,
};

assert.deepEqual(
  getTacticalDirective({
    activeCrisis: { id: "solar_flare", turnsRemaining: 4 },
    activeContracts: [urgentContract],
    currentTurn: 12,
  }),
  { kind: "crisis", turnsRemaining: 4 },
  "an active crisis takes priority over a contract deadline",
);

assert.deepEqual(
  getTacticalDirective({
    activeCrisis: null,
    activeContracts: [lessUrgentContract, urgentContract, normalContract],
    currentTurn: 12,
  }),
  { kind: "contract", turnsRemaining: 1 },
  "the earliest contract deadline within two turns becomes the directive",
);

assert.equal(
  getTacticalDirective({
    activeCrisis: null,
    activeContracts: [normalContract],
    currentTurn: 12,
  }),
  null,
  "the campaign directive remains visible when no crisis or urgent contract exists",
);

for (const [language, catalog] of [
  ["Russian", russian],
  ["English", english],
]) {
  for (const key of ["active_crisis", "urgent_contract"]) {
    assert.equal(
      typeof catalog.campaign_directive[key]?.title,
      "string",
      `${language} catalog includes campaign_directive.${key}.title`,
    );
    assert.equal(
      typeof catalog.campaign_directive[key]?.description,
      "string",
      `${language} catalog includes campaign_directive.${key}.description`,
    );
    assert.equal(
      typeof catalog.campaign_directive[key]?.action,
      "string",
      `${language} catalog includes campaign_directive.${key}.action`,
    );
  }
}

console.log("Tactical directive checks passed");
