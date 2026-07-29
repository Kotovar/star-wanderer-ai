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
