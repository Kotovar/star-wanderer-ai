import assert from "node:assert/strict";
import { getArtifactEffectDisplay } from "../src/game/artifacts/display.ts";

assert.deepEqual(
  getArtifactEffectDisplay("module_armor", 3, 3),
  {
    baseValue: 3,
    currentValue: 3,
    isModified: false,
    baseLabel: "3",
    currentLabel: "3",
  },
  "an unboosted armor artifact must show its base +3 value",
);

assert.deepEqual(
  getArtifactEffectDisplay("module_armor", 3, Math.round(3 * 1.5)),
  {
    baseValue: 3,
    currentValue: 5,
    isModified: true,
    baseLabel: "3",
    currentLabel: "5",
  },
  "a +50% artifact boost must display the rounded +5 armor value",
);

assert.deepEqual(
  getArtifactEffectDisplay("damage_boost", 0.3, 0.3 * 1.68),
  {
    baseValue: 0.3,
    currentValue: 0.504,
    isModified: true,
    baseLabel: "30%",
    currentLabel: "50%",
  },
  "a 30% damage boost with +68% artifact power must display 50%",
);

assert.deepEqual(
  getArtifactEffectDisplay("auto_repair", 8, 13),
  {
    baseValue: 8,
    currentValue: 13,
    isModified: true,
    baseLabel: "8%",
    currentLabel: "13%",
  },
  "whole-number percentage effects must keep their percent unit",
);

console.log("Artifact effect display checks passed");
