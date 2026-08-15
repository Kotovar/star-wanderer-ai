import assert from "node:assert/strict";
import fs from "node:fs";
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
  UPKEEP_INTERVAL,
  PAID_HAPPINESS_BONUS,
  UNPAID_HAPPINESS_PENALTY,
  UNPAID_HARDWARE_DAMAGE,
  getMemberWage,
  getCrewUpkeep,
  getTemplateCrewUpkeep,
  getTurnsUntilUpkeep,
  settleUpkeep,
} = jiti("../src/game/crew/upkeep.ts");
const { SHIP_TEMPLATES } = jiti("../src/game/constants/shipTemplates.ts");

/** Верхняя граница давления: жалованье стартового экипажа за ход */
const MAX_START_DRAIN_PER_TURN = 5;

assert.equal(UPKEEP_INTERVAL, 50);

// Формула: база + уровень, синтетикам половина
assert.equal(getMemberWage({ level: 1, race: "human" }), 50);
assert.equal(getMemberWage({ level: 5, race: "human" }), 150);
assert.equal(getMemberWage({ level: 1, race: "synthetic" }), 25);
assert.ok(
  getMemberWage({ level: 3, race: "synthetic" }) <
    getMemberWage({ level: 3, race: "human" }),
  "synthetics must stay cheaper than organics at the same level",
);

// Жалованье растёт вместе с экипажем — иначе прокачка не имеет цены
assert.ok(
  getCrewUpkeep([
    { level: 5, race: "human" },
    { level: 5, race: "human" },
  ]) > getCrewUpkeep([{ level: 1, race: "human" }]),
  "upkeep must scale with crew size and level",
);

// Обратный отсчёт: в ход выплаты счётчик сбрасывается на полный период
assert.equal(getTurnsUntilUpkeep(UPKEEP_INTERVAL - 1), 1);
assert.equal(getTurnsUntilUpkeep(UPKEEP_INTERVAL), UPKEEP_INTERVAL);

// Баланс: стартовое жалованье — заметная, но не удушающая нагрузка на ход
for (const template of SHIP_TEMPLATES) {
  const upkeep = getTemplateCrewUpkeep(template.crew);
  assert.ok(upkeep > 0, `${template.id}: template crew must cost something`);
  assert.ok(
    upkeep / UPKEEP_INTERVAL <= MAX_START_DRAIN_PER_TURN,
    `${template.id}: starting upkeep drains ${upkeep / UPKEEP_INTERVAL}₢ per turn`,
  );
}

// ── Поведение выплаты ────────────────────────────────────────────────────────

const organic = (id, level = 1) => ({
  id,
  race: "human",
  level,
  happiness: 60,
  maxHappiness: 100,
  health: 100,
});
const synthetic = (id, level = 1) => ({
  id,
  race: "synthetic",
  level,
  happiness: 0,
  maxHappiness: 100,
  health: 100,
});

// Полная выплата: списание, плюс настроения органикам, синтетики целы
{
  const crew = [organic(1), synthetic(2)];
  const due = getCrewUpkeep(crew);
  const { crew: paidCrew, report } = settleUpkeep(crew, 1000, UPKEEP_INTERVAL);

  assert.equal(report.creditsLeft, 1000 - due);
  assert.equal(paidCrew[0].happiness, 60 + PAID_HAPPINESS_BONUS);
  assert.equal(paidCrew[1].health, 100, "paid synthetics take no damage");
  assert.deepEqual(report, {
    turn: UPKEEP_INTERVAL,
    due,
    paid: due,
    creditsLeft: 1000 - due,
    happinessChange: PAID_HAPPINESS_BONUS,
    hardwareDamage: 0,
    organicCount: 1,
    syntheticCount: 1,
  });
}

// Пустой счёт: органики теряют настроение, синтетики — здоровье.
// Эмоций у синтетиков нет, иначе долг им ничего не стоил бы
{
  const crew = [organic(1), synthetic(2)];
  const { crew: unpaidCrew, report } = settleUpkeep(crew, 0, UPKEEP_INTERVAL * 2);

  assert.equal(report.paid, 0);
  assert.equal(unpaidCrew[0].happiness, 60 - UNPAID_HAPPINESS_PENALTY);
  assert.equal(unpaidCrew[1].happiness, 0, "synthetics have no happiness");
  assert.equal(unpaidCrew[1].health, 100 - UNPAID_HARDWARE_DAMAGE);
  assert.equal(report.hardwareDamage, UNPAID_HARDWARE_DAMAGE);
}

// Частичная выплата — тоже недоплата: последствия те же
{
  const crew = [organic(1)];
  const due = getCrewUpkeep(crew);
  const { crew: partialCrew, report } = settleUpkeep(crew, due - 1, UPKEEP_INTERVAL);

  assert.equal(report.paid, due - 1);
  assert.equal(report.creditsLeft, 0);
  assert.equal(partialCrew[0].happiness, 60 - UNPAID_HAPPINESS_PENALTY);
}

// Невыплата должна бить по морали ДО проверки дезертирства в том же ходу
const loopSource = fs.readFileSync(
  path.join(root, "src/game/slices/gameLoop/gameLoopSlice.ts"),
  "utf8",
);
const upkeepAt = loopSource.indexOf("processCrewUpkeep(set, get)");
const desertionAt = loopSource.indexOf("processors.processDesertion(set, get)");
assert.ok(upkeepAt > 0, "nextTurn must pay crew upkeep");
assert.ok(
  upkeepAt < desertionAt,
  "upkeep must be charged before desertion is processed",
);

console.log("Crew upkeep checks passed");
