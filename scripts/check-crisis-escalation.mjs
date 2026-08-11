import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  CRISIS_STAGES,
  getCrisisResponseChance,
  getCrisisStage,
} from "../src/game/crises/escalation.ts";

const require = createRequire(import.meta.url);
const scriptPath = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(scriptPath), "..");
const jiti = require("jiti")(scriptPath, {
  alias: { "@": path.join(root, "src") },
});
const { GLOBAL_CRISES } = jiti(
  "../src/game/constants/globalCrises.ts",
);

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

const runCrisisTurn = (
  crisisId,
  { crew = [], data = {}, turnsRemaining } = {},
) => {
  const crisis = GLOBAL_CRISES.find(({ id }) => id === crisisId);
  assert.ok(crisis?.onTurnEffect, `нет эффекта хода для ${crisisId}`);

  const state = {
    turn: 50,
    credits: 100,
    currentSector: { tier: 1 },
    victoryTriggered: false,
    gameVictory: false,
    ship: {
      modules: [],
      tradeGoods: [],
      fuel: 100,
      shields: 10,
    },
    crew,
  };
  const logs = [];
  const set = (updater) => Object.assign(state, updater(state));
  const get = () => ({
    ...state,
    addLog: (message, type) => logs.push({ message, type }),
  });

  crisis.onTurnEffect(set, get, {
    id: crisisId,
    turnsRemaining: turnsRemaining ?? crisis.duration,
    data,
  });
  return logs;
};

for (const crisisId of ["raider_wave", "solar_flare", "epidemic"]) {
  assert.equal(
    runCrisisTurn(crisisId).at(-1)?.type,
    "warning",
    `${crisisId}: повторяющийся эффект не должен открывать error-toast`,
  );
}

const epidemicLogs = runCrisisTurn("epidemic", {
  turnsRemaining: 1,
  data: {
    infectedCrewIds: [1],
    epidemicSpreadStage: "incident",
  },
  crew: [
    {
      id: 1,
      name: "Заражённый",
      race: "human",
      profession: "pilot",
      health: 100,
      happiness: 100,
    },
    {
      id: 2,
      name: "Новый пациент",
      race: "human",
      profession: "engineer",
      health: 100,
      happiness: 100,
    },
  ],
});
assert.deepEqual(
  epidemicLogs.map(({ type }) => type),
  ["error", "warning"],
  "новое заражение должно остаться разовым error-событием",
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
  if (locale === "ru") {
    assert.equal(
      catalog.crisis_panel.stage.stages.escalation.name,
      "Обострение",
    );
  }
}

const gameLoop = readFileSync(
  path.join(root, "src/game/slices/gameLoop/gameLoopSlice.ts"),
  "utf8",
);
const crisisPanel = readFileSync(
  path.join(root, "src/game/components/CrisisPanel.tsx"),
  "utf8",
);
assert.match(gameLoop, /import \{ toast \} from "sonner";/);
assert.match(gameLoop, /toast\.error\(failureMessage\)/);
assert.match(gameLoop, /toast\.success\(successMessage\)/);
assert.match(crisisPanel, /crew\.maxHappiness > 0/);

console.log("Crisis escalation checks passed");
