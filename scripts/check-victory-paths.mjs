import assert from "node:assert/strict";
import {
  VICTORY_OBJECTIVES,
  canRevealLateCampaign,
  getCampaignDirective,
  getCompletedVictoryObjective,
  getVictoryObjectives,
} from "../src/game/constants/victoryObjectives.ts";

const state = {
  artifacts: Array.from({ length: 3 }, (_, index) => ({
    id: `artifact-${index}`,
    researched: true,
  })),
  completedContractIds: Array.from({ length: 8 }, (_, index) => `contract-${index}`),
  completedLocations: [],
  completedVictoryObjectiveIds: [],
  credits: 8000,
  currentSector: { tier: 1 },
  traveling: null,
  galaxy: { sectors: [] },
  knownRaces: ["human", "krylorian", "crystalline"],
  raceReputation: { human: 51, krylorian: 51, crystalline: 51 },
  startModifierIds: ["doctrine_trader"],
  research: {
    researchedTechs: Array.from({ length: 12 }, (_, index) => `tech-${index}`),
  },
};

assert.equal(VICTORY_OBJECTIVES.scientific_ascension.isComplete(state), true);
assert.equal(VICTORY_OBJECTIVES.galactic_coalition.isComplete(state), true);
assert.equal(canRevealLateCampaign(1, false), false);
assert.equal(canRevealLateCampaign(2, false), false);
assert.equal(canRevealLateCampaign(3, false), true);
assert.equal(canRevealLateCampaign(1, true), true);
assert.equal(getCompletedVictoryObjective(state)?.id, "scientific_ascension");
assert.equal(getCampaignDirective(state)?.objective.id, "reach_tier4");
assert.equal(
  getCampaignDirective(state)?.displayTitleKey,
  "campaign_directive.explore.title",
);
assert.equal(
  getCampaignDirective(state)?.detail.key,
  "campaign_directive.explore.description",
);

state.currentSector = { tier: 3 };
assert.equal(getCampaignDirective(state)?.displayTitleKey, undefined);
assert.equal(
  getCampaignDirective(state)?.detail.key,
  "campaign_directive.reach_tier4",
);

state.completedVictoryObjectiveIds.push("scientific_ascension");
assert.equal(getCompletedVictoryObjective(state)?.id, "galactic_coalition");

state.research.researchedTechs.pop();
state.knownRaces.pop();

assert.equal(VICTORY_OBJECTIVES.scientific_ascension.isComplete(state), false);
assert.equal(VICTORY_OBJECTIVES.galactic_coalition.isComplete(state), false);

state.currentSector = { tier: 1 };
state.traveling = {
  destination: { tier: 4 },
  turnsLeft: 3,
  turnsTotal: 3,
};
assert.equal(VICTORY_OBJECTIVES.reach_tier4.isComplete(state), false);

state.traveling = null;
state.currentSector = { tier: 4 };
assert.equal(VICTORY_OBJECTIVES.reach_tier4.isComplete(state), true);
assert.equal(getCompletedVictoryObjective(state), undefined);
assert.equal(getCampaignDirective(state)?.objective.id, "galactic_coalition");
assert.equal(
  getVictoryObjectives().some((objective) => objective.id === "reach_tier4"),
  false,
);

console.log("Victory path checks passed");
