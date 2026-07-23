import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  CRISIS_STAGES,
  getCrisisResponseChance,
  getCrisisStage,
} from "../src/game/crises/escalation.ts";

const duration = 32;
const crisisAt = (turnsRemaining) => ({
  id: "raider_wave",
  turnsRemaining,
});

assert.deepEqual(
  CRISIS_STAGES.map((stage) => stage.id),
  ["incident", "escalation", "critical", "catastrophic"],
);
assert.equal(getCrisisStage(crisisAt(32), duration).id, "incident");
assert.equal(getCrisisStage(crisisAt(24), duration).id, "escalation");
assert.equal(getCrisisStage(crisisAt(14), duration).id, "critical");
assert.equal(getCrisisStage(crisisAt(6), duration).id, "catastrophic");
assert.ok(
  getCrisisStage(crisisAt(6), duration).effectMultiplier >
    getCrisisStage(crisisAt(32), duration).effectMultiplier,
  "ущерб должен расти по стадиям",
);
assert.ok(
  getCrisisResponseChance(0.42, crisisAt(6), duration) <
    getCrisisResponseChance(0.42, crisisAt(32), duration),
  "позднее подавление должно быть сложнее",
);

for (const locale of ["ru", "en"]) {
  const catalog = JSON.parse(
    readFileSync(new URL(`../src/lib/locales/${locale}.json`, import.meta.url), "utf8"),
  );
  for (const stage of CRISIS_STAGES) {
    const translation = catalog.crisis_panel.stage.stages[stage.id];
    assert.equal(typeof translation?.name, "string", `${locale}/${stage.id}: нет названия`);
    assert.equal(
      typeof translation?.description,
      "string",
      `${locale}/${stage.id}: нет описания`,
    );
  }
}

console.log("Crisis escalation checks passed");
