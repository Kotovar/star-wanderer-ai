import assert from "node:assert/strict";
import {
  TECH_TREE,
  TECH_TREE_TIERS,
  getTechPerkValue,
  getTechPerkNameKey,
  getTechPerkDescKey,
} from "../src/game/constants/techTree.ts";
import { getPendingCrewPerkChoice, fillMissingTechPerkTiers } from "../src/game/crew/techPerks.ts";
import ruLocale from "../src/lib/locales/ru.json" with { type: "json" };
import enLocale from "../src/lib/locales/en.json" with { type: "json" };

const PROFESSIONS = ["pilot", "engineer", "medic", "scout", "scientist", "gunner"];
const BRANCHES = ["A", "B"];

const getByDotPath = (obj, path) =>
  path.split(".").reduce((node, key) => node?.[key], obj);

// --- Data integrity: every profession has all 3 tiers × 2 branches, values increase per tier ---
for (const profession of PROFESSIONS) {
  const tree = TECH_TREE[profession];
  assert.ok(tree, `${profession} must have a tech tree entry`);
  assert.deepEqual(
    Object.keys(tree).map(Number).sort(),
    TECH_TREE_TIERS,
    `${profession} must define exactly tiers ${TECH_TREE_TIERS}`,
  );
  for (const branch of BRANCHES) {
    const values = TECH_TREE_TIERS.map((tier) => tree[tier][branch].value);
    assert.ok(
      values[0] < values[1] && values[1] <= values[2],
      `${profession} branch ${branch} values must strictly increase from tier 3 to 6 (got ${values})`,
    );
    for (const tier of TECH_TREE_TIERS) {
      assert.ok(
        tree[tier][branch].icon.length > 0,
        `${profession} tier ${tier} branch ${branch} must have an icon`,
      );
      // Name/desc live in locale files, not in the data module — check both
      // languages actually have text at the key this branch resolves to.
      for (const [langName, locale] of [["ru", ruLocale], ["en", enLocale]]) {
        const name = getByDotPath(locale, getTechPerkNameKey(profession, tier, branch));
        const desc = getByDotPath(locale, getTechPerkDescKey(profession, tier, branch));
        assert.ok(
          typeof name === "string" && name.length > 0,
          `${langName}.json is missing tech_tree.${profession}.${tier}.${branch}.name`,
        );
        assert.ok(
          typeof desc === "string" && desc.length > 0,
          `${langName}.json is missing tech_tree.${profession}.${tier}.${branch}.desc`,
        );
      }
    }
  }
}

// --- getTechPerkValue: no pick, single pick, replace-not-stack, independent branches ---
assert.equal(
  getTechPerkValue({ profession: "pilot", techPerks: undefined }, "A"),
  0,
  "no picks means zero bonus",
);
assert.equal(
  getTechPerkValue({ profession: "pilot", techPerks: { 3: "A" } }, "A"),
  TECH_TREE.pilot[3].A.value,
  "a single tier-3 pick returns that tier's value",
);
assert.equal(
  getTechPerkValue({ profession: "pilot", techPerks: { 3: "A", 6: "A" } }, "A"),
  TECH_TREE.pilot[6].A.value,
  "picking the same branch again at a higher tier replaces (does not add to) the lower tier's value",
);
assert.equal(
  getTechPerkValue({ profession: "pilot", techPerks: { 3: "A", 9: "B" } }, "B"),
  TECH_TREE.pilot[9].B.value,
  "a different branch at a different tier is tracked independently",
);
assert.equal(
  getTechPerkValue({ profession: "pilot", techPerks: { 3: "A", 9: "B" } }, "A"),
  TECH_TREE.pilot[3].A.value,
  "an earlier pick of the other branch is unaffected by a later different-branch pick",
);

// --- getPendingCrewPerkChoice: derivation from level + existing picks ---
const crewMember = (overrides) => ({
  id: 1,
  name: "Test",
  race: "human",
  profession: "pilot",
  level: 1,
  health: 100,
  techPerks: undefined,
  ...overrides,
});

assert.equal(
  getPendingCrewPerkChoice([crewMember({ level: 2 })]),
  null,
  "below tier 3, no pending choice",
);
assert.deepEqual(
  getPendingCrewPerkChoice([crewMember({ level: 3 })]),
  { crewMemberId: 1, profession: "pilot", tier: 3 },
  "at exactly tier 3 with no prior pick, tier 3 is pending",
);
assert.equal(
  getPendingCrewPerkChoice([crewMember({ level: 3, techPerks: { 3: "A" } })]),
  null,
  "once tier 3 is picked, no further choice pending until tier 6",
);
assert.deepEqual(
  getPendingCrewPerkChoice([
    crewMember({ level: 9, techPerks: { 3: "A" } }),
  ]),
  { crewMemberId: 1, profession: "pilot", tier: 6 },
  "a multi-level jump (e.g. level 3 -> 9 in one exp gain) must not skip tier 6 — it's still the first missing tier",
);
assert.equal(
  getPendingCrewPerkChoice([
    crewMember({ level: 9, techPerks: { 3: "A", 6: "B", 9: "A" } }),
  ]),
  null,
  "once all tiers up to the crew member's level are picked, nothing is pending",
);
assert.equal(
  getPendingCrewPerkChoice([crewMember({ level: 5, health: 0 })]),
  null,
  "a dead crew member is never offered a choice",
);
assert.deepEqual(
  getPendingCrewPerkChoice([
    crewMember({ id: 1, level: 2 }),
    crewMember({ id: 2, level: 3, profession: "engineer" }),
  ]),
  { crewMemberId: 2, profession: "engineer", tier: 3 },
  "iterates crew in order and returns the first member with a pending tier",
);
assert.deepEqual(
  getPendingCrewPerkChoice([
    crewMember({ id: 1, level: 3, techPerks: { 3: "A" } }),
  ]),
  null,
  "hiring/rescuing a crew member already above a tier with no recorded pick is still detected (this same function runs regardless of how the crew member reached that level)",
);

// --- fillMissingTechPerkTiers: auto-picks for characters that skip the normal level-up flow ---
assert.equal(
  fillMissingTechPerkTiers(2, undefined, () => 0.9),
  undefined,
  "below tier 3, nothing to fill — stays undefined, not an empty object",
);
assert.deepEqual(
  fillMissingTechPerkTiers(3, undefined, () => 0.1),
  { 3: "A" },
  "a fresh level-3 character with no picks gets tier 3 rolled",
);
assert.deepEqual(
  fillMissingTechPerkTiers(3, undefined, () => 0.9),
  { 3: "B" },
  "roll >= 0.5 picks branch B",
);
assert.deepEqual(
  fillMissingTechPerkTiers(8, undefined, () => 0.1),
  { 3: "A", 6: "A" },
  "a fresh level-8 character gets both passed tiers (3 and 6) rolled, but not the unreached tier 9",
);
assert.deepEqual(
  fillMissingTechPerkTiers(8, { 3: "B" }, () => 0.1),
  { 3: "B", 6: "A" },
  "an already-recorded pick (e.g. explicitly authored) is never overwritten by the auto-roll",
);
{
  let calls = 0;
  fillMissingTechPerkTiers(9, undefined, () => {
    calls += 1;
    return 0.1;
  });
  assert.equal(
    calls,
    3,
    "randomFn is called exactly once per missing tier (3, 6, 9), not once total",
  );
}
{
  const filled = fillMissingTechPerkTiers(9, undefined);
  assert.deepEqual(
    Object.keys(filled).map(Number).sort(),
    TECH_TREE_TIERS,
    "randomFn defaults to Math.random when omitted, and still fills every passed tier",
  );
}

console.log("Crew tech tree checks passed");
