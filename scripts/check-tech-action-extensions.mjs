import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { TIER2_TECHS } from "../src/game/constants/research/tier2.ts";
import { TIER3_TECHS } from "../src/game/constants/research/tier3.ts";

const hasSpecialAbility = (tech, description) =>
  tech.bonuses.some(
    (bonus) =>
      bonus.type === "special_ability" && bonus.description === description,
  );

const [nanites, therapy, retraining, battleResults] = await Promise.all([
  readFile(new URL("../src/game/slices/combat/helpers/naniteRecovery.ts", import.meta.url), "utf8"),
  readFile(new URL("../src/game/slices/services/helpers/geneticTherapy.ts", import.meta.url), "utf8"),
  readFile(new URL("../src/game/slices/planetEffects/helpers/retrainCrew.ts", import.meta.url), "utf8"),
  readFile(new URL("../src/game/components/BattleResultsPanel.tsx", import.meta.url), "utf8"),
]);

assert.match(nanites, /includes\("nanite_hull"\)/);
assert.match(nanites, /target\.health = restoredHealth/);
assert.match(nanites, /naniteRecoveryUsed = true/);
assert.match(battleResults, /recoverModuleWithNanites/);

assert.match(therapy, /includes\("genetic_enhancement"\)/);
assert.match(therapy, /candidate\.type === "negative"/);
assert.match(therapy, /geneticTherapyUsed: true/);

assert.match(retraining, /includes\("crew_training"\)/);
assert.match(retraining, /academy-retraining:\$\{planetId\}/);
assert.match(retraining, /profession/);

assert.ok(
  hasSpecialAbility(
    TIER2_TECHS.ion_drive,
    "Сокращает межтировой перелёт на 1 ход",
  ),
);
assert.ok(
  hasSpecialAbility(
    TIER2_TECHS.crew_training,
    "Разблокирует смену профессии в человеческой Академии",
  ),
);
assert.ok(
  hasSpecialAbility(
    TIER2_TECHS.expedition_kits,
    "Разблокирует экспедиции на полностью разведанных пустых планетах",
  ),
);
assert.ok(
  hasSpecialAbility(
    TIER3_TECHS.genetic_enhancement,
    "Разовая терапия негативной черты для каждого члена экипажа в медотсеке",
  ),
);
assert.ok(
  hasSpecialAbility(
    TIER3_TECHS.nanite_hull,
    "После победы восстанавливает один уничтоженный модуль до 20% прочности",
  ),
);

console.log("Technology action extension checks passed");
