import assert from "node:assert/strict";
import { TIER3_TECHS } from "../src/game/constants/research/tier3.ts";

const augmentationResearch = TIER3_TECHS.cybernetic_augmentation;

assert.equal(augmentationResearch.tier, 3);
assert.deepEqual(augmentationResearch.prerequisites, ["xenobiology"]);

console.log("Augmentation research checks passed");
