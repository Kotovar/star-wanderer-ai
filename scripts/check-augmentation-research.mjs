import assert from "node:assert/strict";
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
const { getMedicalAugmentationCatalog } = jiti(
  "../src/game/stations/medicalAugmentations.ts",
);
const { createAugmentationsSlice } = jiti(
  "../src/game/slices/augmentations/augmentationsSlice.ts",
);

const augmentationResearch = TIER3_TECHS.cybernetic_augmentation;

assert.equal(augmentationResearch.tier, 3);
assert.deepEqual(augmentationResearch.prerequisites, ["xenobiology"]);

const catalog = getMedicalAugmentationCatalog("medical-alpha", "human");
assert.deepEqual(
  catalog,
  getMedicalAugmentationCatalog("medical-alpha", "human"),
  "station catalog must be stable",
);
assert.equal(catalog.length, 4, "racial stations must offer four implants");
assert.ok(
  catalog.includes("adaptive_neural_link"),
  "the dominant race implant must be in the catalog",
);
assert.equal(
  new Set(catalog).size,
  4,
  "a station catalog must not repeat implants",
);
assert.equal(
  getMedicalAugmentationCatalog("legacy-medical").length,
  3,
  "legacy stations without a dominant race keep three professional implants",
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
assert.equal(AUGMENTATIONS.combat_targeting_matrix.effect.critBonus, 0.1);

console.log("Augmentation research checks passed");
