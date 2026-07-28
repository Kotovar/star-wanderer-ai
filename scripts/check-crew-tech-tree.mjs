import assert from "node:assert/strict";
import { TECH_TREE, TECH_TREE_TIERS, getTechPerkValue } from "../src/game/constants/techTree.ts";
import { getPendingCrewPerkChoice } from "../src/game/crew/techPerks.ts";

const PROFESSIONS = ["pilot", "engineer", "medic", "scout", "scientist", "gunner"];
const BRANCHES = ["A", "B"];

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
        tree[tier][branch].name.length > 0 && tree[tier][branch].desc.length > 0,
        `${profession} tier ${tier} branch ${branch} must have name/desc text`,
      );
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

console.log("Crew tech tree checks passed");
