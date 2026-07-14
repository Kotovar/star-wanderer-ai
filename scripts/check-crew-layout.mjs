import assert from "node:assert/strict";
import { getCrewIconLayout } from "../src/game/components/crewIconLayout.ts";

const shipOptions = {
  x: 0,
  y: 0,
  width: 100,
  height: 100,
  iconSize: 20,
  iconGap: 3,
  horizontalPadding: 4,
  topInset: 24,
  bottomInset: 21,
};

const fourCrew = getCrewIconLayout({ count: 4, ...shipOptions });
assert.equal(new Set(fourCrew.map((icon) => icon.y)).size, 1);
assert.ok(fourCrew.every((icon) => icon.size === shipOptions.iconSize));
assert.deepEqual(
  fourCrew.map((icon) => icon.x),
  [4, 27, 50, 73],
);

const fiveCrew = getCrewIconLayout({ count: 5, ...shipOptions });
assert.equal(new Set(fiveCrew.map((icon) => icon.y)).size, 2);
assert.equal(fiveCrew[4].x, 4);
assert.equal(fiveCrew[4].size, shipOptions.iconSize);

const thirteenCrew = getCrewIconLayout({ count: 13, ...shipOptions });
assert.ok(thirteenCrew.every((icon) => icon.size < shipOptions.iconSize));
assert.ok(
  thirteenCrew.every(
    (icon) =>
      icon.y >= shipOptions.topInset &&
      icon.y + icon.size <= shipOptions.height - shipOptions.bottomInset,
  ),
);

const combatCrew = getCrewIconLayout({
  count: 4,
  x: 0,
  y: 0,
  width: 60,
  height: 60,
  iconSize: 12,
  iconGap: 2,
  horizontalPadding: 3,
  topInset: 15,
  bottomInset: 16,
});
assert.equal(new Set(combatCrew.map((icon) => icon.y)).size, 1);
assert.equal(combatCrew.length, 4);

console.log("Crew layout checks passed");
