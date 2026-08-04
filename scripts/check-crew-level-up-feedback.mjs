import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";

const require = createRequire(import.meta.url);
const scriptPath = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(scriptPath), "..");
const jiti = require("jiti")(scriptPath, {
  alias: { "@": path.join(root, "src") },
});
const { gainExp } = jiti("../src/game/slices/crew/helpers/gainExp.ts");
const { getPendingCrewPerkChoice } = jiti("../src/game/crew/techPerks.ts");

const crewMember = {
  id: 7,
  name: "Тест",
  race: "human",
  profession: "engineer",
  level: 2,
  exp: 0,
  health: 31,
  maxHealth: 60,
  happiness: 50,
  maxHappiness: 100,
  turnsAtZeroHappiness: 0,
  assignment: null,
  assignmentEffect: null,
  combatAssignment: null,
  combatAssignmentEffect: null,
  traits: [],
  moduleId: 1,
  movedThisTurn: false,
  isMerged: false,
  mergedModuleId: null,
  firstaidActive: false,
  augmentation: null,
};
const state = {
  crew: [crewMember],
  research: { researchedTechs: [] },
  pendingCrewLevelUps: [],
};

gainExp(crewMember, 200, state, { addLog: () => {} }, (update) => update(state));

assert.equal(state.pendingCrewLevelUps.length, 1, "one successful level-up must enqueue one snapshot");
assert.deepEqual(state.pendingCrewLevelUps[0], {
  crewMemberId: 7,
  crewMemberName: "Тест",
  oldLevel: 2,
  newLevel: 3,
  previousMaxHealth: 60,
  newMaxHealth: 80,
  previousHealth: 31,
  restoredHealth: 80,
});
assert.deepEqual(
  getPendingCrewPerkChoice(state.crew),
  { crewMemberId: 7, profession: "engineer", tier: 3 },
  "tier level must keep using the existing pending perk resolver",
);

const levelUpModal = readFileSync(
  path.join(root, "src/game/components/CrewLevelUpModal.tsx"),
  "utf8",
);
assert.match(levelUpModal, /CrewPerkChoiceContent/, "tier choices must render in the level-up dialog");
assert.match(levelUpModal, /chooseCrewPerk[\s\S]*dismissCrewLevelUp/, "choosing a tier perk must dismiss the queued result");

console.log("Crew level-up feedback checks passed");
