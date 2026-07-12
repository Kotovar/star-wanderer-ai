import assert from "node:assert/strict";
import {
  VICTORY_OBJECTIVES,
} from "../src/game/constants/victoryObjectives.ts";

const state = {
  artifacts: Array.from({ length: 3 }, (_, index) => ({
    id: `artifact-${index}`,
    researched: true,
  })),
  completedContractIds: Array.from({ length: 8 }, (_, index) => `contract-${index}`),
  completedLocations: [],
  credits: 8000,
  currentSector: { tier: 1 },
  galaxy: { sectors: [] },
  knownRaces: ["human", "krylorian", "crystalline"],
  raceReputation: { human: 51, krylorian: 51, crystalline: 51 },
  research: {
    researchedTechs: Array.from({ length: 12 }, (_, index) => `tech-${index}`),
  },
};

assert.equal(VICTORY_OBJECTIVES.scientific_ascension.isComplete(state), true);
assert.equal(VICTORY_OBJECTIVES.galactic_coalition.isComplete(state), true);

state.research.researchedTechs.pop();
state.knownRaces.pop();

assert.equal(VICTORY_OBJECTIVES.scientific_ascension.isComplete(state), false);
assert.equal(VICTORY_OBJECTIVES.galactic_coalition.isComplete(state), false);

console.log("Victory path checks passed");
