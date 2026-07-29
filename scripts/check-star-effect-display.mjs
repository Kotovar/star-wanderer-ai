import assert from "node:assert/strict";
import { STAR_TYPE_EFFECTS } from "../src/game/constants/starEffects.ts";
import { getStarEffectDisplay } from "../src/game/constants/starEffectDisplay.ts";
import ruLocale from "../src/lib/locales/ru.json" with { type: "json" };
import enLocale from "../src/lib/locales/en.json" with { type: "json" };

const NON_SPECIAL_STAR_TYPES = Object.keys(STAR_TYPE_EFFECTS).filter(
  (t) => t !== "neutron_star" && t !== "blackhole",
);

// --- Every non-special star type produces a non-null display ---
for (const starType of NON_SPECIAL_STAR_TYPES) {
  const display = getStarEffectDisplay(STAR_TYPE_EFFECTS[starType]);
  assert.ok(
    display,
    `${starType} has a non-empty StarTypeEffect but getStarEffectDisplay returned null — a field was added to StarTypeEffect without a matching display case`,
  );

  // --- The locale key exists in both locale files (nested path lookup) ---
  const path = display.key.split(".");
  const lookup = (locale) =>
    path.reduce((obj, segment) => obj?.[segment], locale);
  assert.ok(
    typeof lookup(ruLocale) === "string",
    `${display.key} must exist as a string in ru.json (star type: ${starType})`,
  );
  assert.ok(
    typeof lookup(enLocale) === "string",
    `${display.key} must exist as a string in en.json (star type: ${starType})`,
  );

  // --- Placeholder/param parity: every {{placeholder}} in the resolved
  // locale string must exactly match the keys of display.params, in both
  // locale files ---
  for (const [name, cat] of [["ru", ruLocale], ["en", enLocale]]) {
    const str = lookup(cat);
    const placeholders = [...str.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]);
    assert.deepEqual(
      [...placeholders].sort(),
      Object.keys(display.params).sort(),
      `${display.key} (${name}.json) placeholders must match getStarEffectDisplay params for ${starType}`,
    );
  }

  // --- Sign-safety for always-positive fields: getStarEffectDisplay
  // hardcodes a leading "+" for these fields, so a negative value would
  // render a broken "+-3%" string ---
  for (const field of ["evasionBonus", "scanRangeBonus", "powerBonus"]) {
    if (STAR_TYPE_EFFECTS[starType][field] !== undefined) {
      assert.ok(
        STAR_TYPE_EFFECTS[starType][field] > 0,
        `${starType}.${field} must be positive — getStarEffectDisplay hardcodes a "+" prefix for this field and does not handle negative values`,
      );
    }
  }

  // --- One-field-per-type invariant: getStarEffectDisplay's if-chain only
  // renders the first matching field, silently dropping any others ---
  assert.equal(
    Object.keys(STAR_TYPE_EFFECTS[starType]).length,
    1,
    `${starType} must have exactly one non-empty StarTypeEffect field — getStarEffectDisplay's if-chain only renders the first match, silently dropping any others`,
  );
}

// --- neutron_star / blackhole never get a display (out of scope) ---
assert.equal(getStarEffectDisplay(STAR_TYPE_EFFECTS.neutron_star), null);
assert.equal(getStarEffectDisplay(STAR_TYPE_EFFECTS.blackhole), null);

// --- happinessPerTurn sign is computed correctly ---
const positiveHappiness = getStarEffectDisplay({ happinessPerTurn: 1 });
assert.equal(positiveHappiness.params.value, "+1");
const negativeHappiness = getStarEffectDisplay({ happinessPerTurn: -1 });
assert.equal(negativeHappiness.params.value, "-1");

console.log("Star effect display checks passed");
