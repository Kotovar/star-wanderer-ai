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

const { canRevealLateCampaign, getCampaignDirective } = jiti(
  "../src/game/constants/victoryObjectives.ts",
);
const {
  getHighestReachedTier,
  getNextTierAccessRequirements,
} = jiti("../src/game/progression/campaignProgress.ts");

const panelSource = readFileSync(
  path.join(root, "src/game/components/CampaignProgressPanel.tsx"),
  "utf8",
);
const english = JSON.parse(
  readFileSync(path.join(root, "src/lib/locales/en.json"), "utf8"),
);
const russian = JSON.parse(
  readFileSync(path.join(root, "src/lib/locales/ru.json"), "utf8"),
);

const inner = { id: 1, tier: 1, visited: true, locations: [] };
const farRim = { id: 2, tier: 4, visited: true, locations: [] };
const state = {
  artifacts: [],
  completedContractIds: [],
  completedLocations: [],
  completedVictoryObjectiveIds: ["reach_tier4"],
  credits: 0,
  currentSector: inner,
  traveling: null,
  galaxy: { sectors: [inner, farRim] },
  knownRaces: [],
  raceReputation: {},
  research: { researchedTechs: [] },
  startModifierIds: [],
};

assert.equal(
  getCampaignDirective(state)?.objective.id,
  "defeat_void_oracle",
  "a completed frontier route is not suggested again after returning inward",
);
assert.equal(
  getCampaignDirective({
    ...state,
    completedVictoryObjectiveIds: [],
  })?.objective.id,
  "defeat_void_oracle",
  "reaching tier 4 remains complete after returning inward even without a victory record",
);

const outer = { id: 3, tier: 3, visited: true, locations: [] };
const highestReachedTier = getHighestReachedTier([inner, outer], inner);
assert.equal(
  highestReachedTier,
  3,
  "campaign progress retains the furthest visited tier after returning inward",
);
assert.equal(
  canRevealLateCampaign(highestReachedTier, false),
  true,
  "visiting tier 3 permanently reveals the late campaign",
);
assert.deepEqual(
  getNextTierAccessRequirements(highestReachedTier),
  { tier: 4, engineLevel: 4, captainLevel: 4 },
  "the next campaign gate shows the same engine and captain requirement as travel",
);

const tierThreeDirective = getCampaignDirective({
  ...state,
  completedVictoryObjectiveIds: [],
  galaxy: { sectors: [inner, outer] },
});
assert.equal(
  tierThreeDirective?.detail.key,
  "campaign_directive.reach_tier4",
  "the directive keeps pointing to the frontier after returning from tier 3",
);

assert.equal(
  english.campaign_progress.current_region,
  "Current region",
  "English campaign metrics have a localized current-region label",
);
assert.equal(
  english.campaign_progress.galaxy_route,
  "Galaxy route",
  "English campaign route section is localized",
);
assert.equal(
  english.campaign_progress.progress_systems,
  "Progress systems",
  "English campaign system section is localized",
);
const campaignProgressKeys = [
  ...new Set(
    [...panelSource.matchAll(/campaign_progress\.([a-z_]+)/g)].map(
      ([, key]) => key,
    ),
  ),
];
for (const [language, catalog] of [
  ["English", english],
  ["Russian", russian],
]) {
  for (const key of campaignProgressKeys) {
    assert.notEqual(
      catalog.campaign_progress[key],
      undefined,
      `${language} catalog includes campaign_progress.${key}`,
    );
  }
}
assert.doesNotMatch(
  panelSource,
  /[А-Яа-яЁё]/,
  "CampaignProgressPanel keeps all player-facing copy in translation catalogs",
);
assert.match(
  panelSource,
  /sector:\s*profileArcTargetSector\s*\?\s*getSectorName\(/,
  "profile coordinates resolve the stored sector localization key",
);
assert.match(
  panelSource,
  /useGameStore\(\(s\) => getEffectiveScanRange\(s\)\)/,
  "scan-range display subscribes to the computed value",
);
assert.match(
  panelSource,
  /getCampaignDirective\(/,
  "the panel renders the shared campaign directive",
);

console.log("Campaign progress checks passed");
