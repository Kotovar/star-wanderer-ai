import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { TIER3_TECHS } from "../src/game/constants/research/tier3.ts";

const require = createRequire(import.meta.url);
const scriptPath = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(scriptPath), "..");
const jiti = require("jiti")(scriptPath, {
  alias: { "@": path.join(root, "src") },
});
const { AUGMENTATIONS } = jiti("../src/game/constants/augmentations.ts");
const { getExtraScoutAttempts } = jiti(
  "../src/game/constants/augmentations.ts",
);
const { getMaxExtraScoutAttempts } = jiti(
  "../src/game/constants/augmentations.ts",
);
const { getDiminishingResearchSpeedBonus } = jiti(
  "../src/game/constants/augmentations.ts",
);
const { getMedicalAugmentationCatalog } = jiti(
  "../src/game/stations/medicalAugmentations.ts",
);
const { createAugmentationsSlice } = jiti(
  "../src/game/slices/augmentations/augmentationsSlice.ts",
);
const { processCombatAssignment } = jiti(
  "../src/game/slices/gameLoop/processors/crewAssignments/processCombatAssignments.ts",
);
const { getTaskBonusMultiplier, getTaskEfficiencyPercent } = jiti(
  "../src/game/slices/gameLoop/processors/crewAssignments/constants.ts",
);
const { getGunnerAccuracyBonus, getGunnerCritBonus } = jiti(
  "../src/game/crew/combatBonuses.ts",
);

const augmentationResearch = TIER3_TECHS.cybernetic_augmentation;

assert.equal(augmentationResearch.tier, 3);
assert.deepEqual(augmentationResearch.prerequisites, ["xenobiology"]);

const alliedHuman = { human: 60 };
const catalog = getMedicalAugmentationCatalog(
  "medical-alpha",
  "human",
  1,
  alliedHuman,
);
assert.deepEqual(
  catalog,
  getMedicalAugmentationCatalog("medical-alpha", "human", 1, alliedHuman),
  "station catalog must be stable",
);
assert.equal(
  catalog.length,
  4,
  "racial stations must offer four implants once reputation is allied",
);
assert.ok(
  catalog.includes("adaptive_neural_link"),
  "the dominant race implant must be in the catalog once reputation is allied",
);
assert.equal(
  new Set(catalog).size,
  4,
  "a station catalog must not repeat implants",
);
assert.equal(
  getMedicalAugmentationCatalog("medical-alpha", "human", 1, {
    human: 10,
  }).length,
  3,
  "the racial implant must be withheld below allied reputation",
);
assert.equal(
  getMedicalAugmentationCatalog("legacy-medical").length,
  3,
  "legacy stations without a dominant race keep three professional implants",
);

const rareOrLegendaryCount = (tier) => {
  let count = 0;
  for (let index = 0; index < 500; index++) {
    const stationCatalog = getMedicalAugmentationCatalog(
      `medical-${index}`,
      undefined,
      tier,
    );
    count += stationCatalog.filter((id) =>
      ["rare", "legendary"].includes(AUGMENTATIONS[id].rarity),
    ).length;
  }
  return count;
};

assert.ok(
  rareOrLegendaryCount(4) > rareOrLegendaryCount(1),
  "higher-tier systems must offer rare augmentations more often",
);

const costsByRarity = Object.values(AUGMENTATIONS).reduce(
  (costs, augmentation) => {
    costs[augmentation.rarity].push(augmentation.installCost);
    return costs;
  },
  { common: [], uncommon: [], rare: [], legendary: [] },
);
assert.ok(
  Math.max(...costsByRarity.common) < Math.min(...costsByRarity.uncommon) &&
    Math.max(...costsByRarity.uncommon) < Math.min(...costsByRarity.rare) &&
    Math.max(...costsByRarity.rare) < Math.min(...costsByRarity.legendary),
  "each higher rarity must be noticeably more expensive",
);

assert.equal(getExtraScoutAttempts({ augmentation: "survey_uplink" }), 2);
assert.equal(
  getMaxExtraScoutAttempts([
    { augmentation: "optical_implant" },
    { augmentation: "survey_uplink" },
  ]),
  2,
  "the best scouting implant in the team must set the sortie count",
);
assert.equal(
  getDiminishingResearchSpeedBonus([
    { augmentation: "memory_core" },
    { augmentation: "quantum_memory_core" },
  ]),
  0.52,
  "research augmentations must have diminishing returns",
);
assert.equal(AUGMENTATIONS.symbiotic_armor.effect.damageToHp, 0.1);
assert.equal(
  getTaskBonusMultiplier({ augmentation: "adaptive_neural_link" }),
  1.15,
  "human task augmentation should apply its task multiplier",
);
assert.equal(
  getTaskBonusMultiplier({ augmentation: "overclock_core" }), 1.5);
assert.equal(
  getTaskEfficiencyPercent({
    happiness: 50,
    maxHappiness: 100,
    traits: [{ effect: { taskBonus: 0.2 } }],
  }),
  120,
  "tentacle-like task bonuses must be included in displayed efficiency",
);
assert.equal(
  getTaskEfficiencyPercent({
    happiness: 50,
    maxHappiness: 100,
    traits: [{ effect: { taskPenalty: 0.2 } }],
  }),
  80,
  "chitin-like task penalties must be included in displayed efficiency",
);
assert.equal(AUGMENTATIONS.quantum_memory_core.effect.researchSpeedBonus, 0.4);
assert.equal(AUGMENTATIONS.combat_cognition.effect.accuracyBonus, 0.25);
assert.equal(AUGMENTATIONS.combat_cognition.effect.critBonus, 0.15);
assert.equal(
  getGunnerAccuracyBonus({ level: 1, augmentation: "combat_cognition" }) -
    getGunnerAccuracyBonus({ level: 1 }),
  0.25,
  "combat foresight must increase gunner accuracy",
);
assert.equal(
  getGunnerCritBonus({ augmentation: "combat_cognition" }),
  0.15,
  "combat foresight must increase gunner critical chance",
);

const source = (file) => readFileSync(path.join(root, file), "utf8");
assert.match(
  source("src/game/slices/locations/helpers/sendScoutingMission.ts"),
  /getMaxExtraScoutAttempts\(scouts\)/,
  "scouting action must use the best implant in the scouting team",
);
assert.match(
  source("src/game/components/EmptyPlanetPanel.tsx"),
  /getMaxExtraScoutAttempts\(scouts\)/,
  "scouting UI must use the best implant in the scouting team",
);
assert.match(
  source("src/game/slices/research/helpers/researchHelpers.ts"),
  /getDiminishingResearchSpeedBonus\(scientists\)/,
  "research output must apply diminishing returns to memory cores",
);
assert.match(
  source("src/game/slices/combat/helpers/playerAttack.ts"),
  /laserWeaponBayIds\.has\(crewMember\.moduleId\)/,
  "prismatic lens must require the wearer to be in a laser weapon bay",
);
assert.match(
  source("src/game/slices/travel/helpers/selectLocation.ts"),
  /discoveredAugmentationIds/,
  "medical station visits must record encountered augmentations",
);

const runCombatAssignment = (crewMember, module) => {
  let combatState = {
    crew: [crewMember],
    ship: { modules: [module] },
    addLog: () => {},
    gainExp: () => {},
  };
  const combatSet = (update) => {
    const patch = typeof update === "function" ? update(combatState) : update;
    combatState = { ...combatState, ...patch };
  };
  processCombatAssignment(
    combatState.crew[0],
    combatState.ship.modules[0],
    undefined,
    combatSet,
    () => combatState,
  );
  return combatState;
};

const combatEngineer = (augmentation) => ({
  id: 1,
  name: "Engineer",
  race: "human",
  profession: "engineer",
  moduleId: 1,
  level: 1,
  health: 100,
  maxHealth: 100,
  augmentation,
  combatAssignment: "repair",
});
const damagedModule = { id: 1, type: "reactor", name: "Reactor", health: 10, maxHealth: 100 };
const baseCombatRepair = runCombatAssignment(
  combatEngineer(undefined),
  damagedModule,
).ship.modules[0].health;
const nanoHandsCombatRepair = runCombatAssignment(
  combatEngineer("nano_hands"),
  damagedModule,
).ship.modules[0].health;
assert.equal(nanoHandsCombatRepair, 27);
assert.ok(
  nanoHandsCombatRepair > baseCombatRepair,
  "nano hands must increase combat repair",
);

const combatMedic = (augmentation) => ({
  id: 1,
  name: "Medic",
  race: "human",
  profession: "medic",
  moduleId: 1,
  level: 1,
  health: 50,
  maxHealth: 100,
  augmentation,
  combatAssignment: "heal",
});
const medicalModule = { id: 1, type: "medical", name: "Medical", health: 100, maxHealth: 100 };
assert.equal(
  runCombatAssignment(combatMedic("accelerated_regen"), medicalModule).crew[0].health,
  73,
  "accelerated regeneration must increase combat healing",
);

let state = {
  research: { researchedTechs: ["cybernetic_augmentation"] },
  currentLocation: {
    id: "medical-alpha",
    type: "station",
    stationType: "medical",
    dominantRace: "human",
  },
  crew: [
    {
      id: 1,
      name: "Alex",
      race: "human",
      profession: "pilot",
      level: 2,
      augmentation: null,
    },
  ],
  credits: 10_000,
  raceReputation: { human: 60 },
  addLog: () => {},
};
const set = (update) => {
  const patch = typeof update === "function" ? update(state) : update;
  state = { ...state, ...patch };
};
const augmentations = createAugmentationsSlice(set, () => state);

augmentations.installAugmentation(1, "adaptive_neural_link");
assert.equal(
  state.crew[0].augmentation,
  null,
  "level 1–2 crew must not receive an augmentation",
);

state = { ...state, crew: [{ ...state.crew[0], level: 3 }] };
augmentations.installAugmentation(1, "adaptive_neural_link");
assert.equal(
  state.crew[0].augmentation,
  "adaptive_neural_link",
  "level 3 crew may receive a catalog augmentation",
);
const surveyStationId = Array.from({ length: 500 }, (_, index) =>
  `survey-medical-${index}`,
).find((stationId) =>
  getMedicalAugmentationCatalog(stationId, "human", 4).includes(
    "survey_uplink",
  ),
);
assert.ok(surveyStationId, "a tier 4 station must be able to offer survey uplink");
state = {
  ...state,
  currentLocation: {
    ...state.currentLocation,
    id: surveyStationId,
    stationId: surveyStationId,
  },
  currentSector: { tier: 4 },
  crew: [{ ...state.crew[0], profession: "scout" }],
};
augmentations.installAugmentation(1, "survey_uplink");
assert.equal(
  state.crew[0].augmentation,
  "survey_uplink",
  "a catalog rare augmentation must be installable through the store action",
);
assert.equal(AUGMENTATIONS.combat_targeting_matrix.effect.critBonus, 0.1);

console.log("Augmentation research checks passed");
