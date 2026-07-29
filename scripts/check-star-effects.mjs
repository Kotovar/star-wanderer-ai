import assert from "node:assert/strict";
import { STAR_TYPE_EFFECTS, getStarTypeEffect } from "../src/game/constants/starEffects.ts";

const ALL_STAR_TYPES = [
  "red_dwarf", "yellow_dwarf", "white_dwarf", "blue_giant", "red_supergiant",
  "neutron_star", "double", "triple", "blackhole", "brown_dwarf",
  "variable_star", "stellar_remnant",
];

// --- Every star type has an explicit entry (no accidental gaps) ---
for (const starType of ALL_STAR_TYPES) {
  assert.ok(
    Object.prototype.hasOwnProperty.call(STAR_TYPE_EFFECTS, starType),
    `${starType} must have an explicit entry in STAR_TYPE_EFFECTS (even if empty {})`,
  );
}
assert.equal(
  Object.keys(STAR_TYPE_EFFECTS).length,
  ALL_STAR_TYPES.length,
  "STAR_TYPE_EFFECTS must have exactly one entry per StarType, no extras",
);

// --- every non-special star type has at least one non-empty effect ---
const NON_SPECIAL_STAR_TYPES = ALL_STAR_TYPES.filter(
  (t) => t !== "neutron_star" && t !== "blackhole",
);
for (const starType of NON_SPECIAL_STAR_TYPES) {
  assert.ok(
    Object.keys(STAR_TYPE_EFFECTS[starType]).length > 0,
    `${starType} must have at least one non-empty effect (it is not neutron_star/blackhole)`,
  );
}

// --- neutron_star / blackhole are intentionally untouched by this feature ---
assert.deepEqual(STAR_TYPE_EFFECTS.neutron_star, {}, "neutron_star already has applyNeutronRadiation — must stay empty here");
assert.deepEqual(STAR_TYPE_EFFECTS.blackhole, {}, "blackhole already has travelThroughBlackHole — must stay empty here");

// --- getStarTypeEffect never throws, falls back to {} ---
assert.deepEqual(getStarTypeEffect("neutron_star"), {});
assert.deepEqual(getStarTypeEffect("yellow_dwarf"), { happinessPerTurn: 1 });

// --- Numeric fields are within sane bounds ---
for (const [starType, effect] of Object.entries(STAR_TYPE_EFFECTS)) {
  if (effect.moduleDecayChance !== undefined) {
    assert.ok(
      effect.moduleDecayChance >= 0 && effect.moduleDecayChance <= 1,
      `${starType}.moduleDecayChance must be a probability in [0, 1]`,
    );
  }
  if (effect.gasDiveYieldBonus !== undefined) {
    assert.ok(effect.gasDiveYieldBonus > 0, `${starType}.gasDiveYieldBonus must be positive`);
  }
  if (effect.salvageYieldBonus !== undefined) {
    assert.ok(effect.salvageYieldBonus > 0, `${starType}.salvageYieldBonus must be positive`);
  }
}

console.log("Star type effects checks passed");
