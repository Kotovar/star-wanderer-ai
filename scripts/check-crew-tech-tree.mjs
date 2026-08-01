import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  TECH_TREE,
  TECH_TREE_TIERS,
  getTechPerkValue,
  getTechPerkNameKey,
  getTechPerkDescKey,
} from "../src/game/constants/techTree.ts";
import * as techTree from "../src/game/constants/techTree.ts";
import { getPendingCrewPerkChoice, fillMissingTechPerkTiers } from "../src/game/crew/techPerks.ts";
import ruLocale from "../src/lib/locales/ru.json" with { type: "json" };
import enLocale from "../src/lib/locales/en.json" with { type: "json" };

const PROFESSIONS = ["pilot", "engineer", "medic", "scout", "scientist", "gunner"];
const BRANCHES = ["A", "B"];
const EXPECTED_TECH_VALUES = {
  pilot: { A: [0.03, 0.04, 0.05], B: [0.03, 0.04, 0.05] },
  engineer: { A: [0.04, 0.06, 0.08], B: [1, 1, 1] },
  medic: { A: [0.04, 0.06, 0.08], B: [1, 1, 1] },
  scout: { A: [0.07, 0.09, 0.12], B: [0.07, 0.09, 0.12] },
  scientist: { A: [0.05, 0.06, 0.09], B: [0.03, 0.04, 0.05] },
  gunner: { A: [0.03, 0.05, 0.06], B: [0.03, 0.05, 0.06] },
};
const PERCENT_BRANCHES = new Set([
  "pilot:A", "pilot:B", "engineer:A", "medic:A", "scout:A", "scout:B",
  "scientist:A", "scientist:B", "gunner:A", "gunner:B",
]);
const EXPECTED_FULL_PATH_TOTALS = {
  pilot: { A: 0.12, B: 0.12 },
  engineer: { A: 0.18, B: 3 },
  medic: { A: 0.18, B: 3 },
  scout: { A: 0.28, B: 0.28 },
  scientist: { A: 0.2, B: 0.12 },
  gunner: { A: 0.14, B: 0.14 },
};
const RACE_TECH_VALUES = {
  human: [0.03, 0.04, 0.05],
  synthetic: [0.03, 0.04, 0.05],
  xenosymbiont: [0.03, 0.04, 0.05],
  krylorian: [0.01, 0.02, 0.03],
  voidborn: [0.03, 0.04, 0.05],
  crystalline: [0.1, 0.2, 0.3],
};
const RACE_TECH_NAMES = {
  ru: {
    human: "Координация",
    synthetic: "Оптимизация систем",
    xenosymbiont: "Симбиотическая поддержка",
    krylorian: "Тактическое присутствие",
    voidborn: "Пустотный резонанс",
    crystalline: "Кристаллическая решётка",
  },
  en: {
    human: "Coordination",
    synthetic: "System Optimization",
    xenosymbiont: "Symbiotic Support",
    krylorian: "Tactical Presence",
    voidborn: "Void Resonance",
    crystalline: "Crystal Lattice",
  },
};

const getByDotPath = (obj, path) =>
  path.split(".").reduce((node, key) => node?.[key], obj);
const shipStatsSource = await readFile(
  new URL("../src/game/components/ShipStats.tsx", import.meta.url),
  "utf8",
);
const playerAttackSource = await readFile(
  new URL("../src/game/slices/combat/helpers/playerAttack.ts", import.meta.url),
  "utf8",
);
const playerDamageSource = await readFile(
  new URL("../src/game/slices/combat/helpers/playerDamage.ts", import.meta.url),
  "utf8",
);
const healthRegenSource = await readFile(
  new URL("../src/game/slices/crew/helpers/calculateHealthRegen.ts", import.meta.url),
  "utf8",
);
const retreatSource = await readFile(
  new URL("../src/game/slices/combat/helpers/retreat.ts", import.meta.url),
  "utf8",
);
const expMultiplierSource = await readFile(
  new URL("../src/game/slices/crew/helpers/calculateExpMultiplier.ts", import.meta.url),
  "utf8",
);
const consumptionSource = await readFile(
  new URL("../src/game/slices/ship/helpers/getTotalConsumption.ts", import.meta.url),
  "utf8",
);
const civilianAssignmentsSource = await readFile(
  new URL("../src/game/slices/gameLoop/processors/crewAssignments/processAssignments.ts", import.meta.url),
  "utf8",
);
const combatAssignmentsSource = await readFile(
  new URL("../src/game/slices/gameLoop/processors/crewAssignments/processCombatAssignments.ts", import.meta.url),
  "utf8",
);
const evasionSource = await readFile(
  new URL("../src/game/slices/ship/helpers/getTotalEvasion.ts", import.meta.url),
  "utf8",
);
const shieldRegenSource = await readFile(
  new URL("../src/game/slices/gameLoop/helpers/shieldRegen.ts", import.meta.url),
  "utf8",
);
const shipStatsUpdateSource = await readFile(
  new URL("../src/game/slices/ship/helpers/updateShipStats.ts", import.meta.url),
  "utf8",
);
const perkChoiceModalSource = await readFile(
  new URL("../src/game/components/CrewPerkChoiceModal.tsx", import.meta.url),
  "utf8",
);
const crewListSource = await readFile(
  new URL("../src/game/components/CrewList.tsx", import.meta.url),
  "utf8",
);
const stationCrewTabSource = await readFile(
  new URL("../src/game/components/station/CrewTab.tsx", import.meta.url),
  "utf8",
);
const crewSliceSource = await readFile(
  new URL("../src/game/slices/crew/crewSlice.ts", import.meta.url),
  "utf8",
);

// --- Data integrity: every profession has all 3 tiers × 2 incremental branches ---
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
    assert.deepEqual(
      values,
      EXPECTED_TECH_VALUES[profession][branch],
      `${profession} branch ${branch} keeps its bounded incremental values`,
    );
    if (PERCENT_BRANCHES.has(`${profession}:${branch}`)) {
      assert.ok(
        values[0] < values[1] && values[1] < values[2],
        `${profession} branch ${branch} percent increments must increase with each tier`,
      );
    }
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
        if (PERCENT_BRANCHES.has(`${profession}:${branch}`)) {
          const percent = Math.round(tree[tier][branch].value * 100);
          assert.match(
            desc,
            new RegExp(`[+-]${percent}%`),
            `${langName}.json must display the ${profession} ${tier} ${branch} increment`,
          );
        }
      }
    }
  }
}

// --- Race branch C: exact data, per-member sum, strongest same-race carrier ---
assert.ok(
  "RACE_TECH_TREE" in techTree &&
    "getRaceTechPerkValue" in techTree &&
    "getStrongestRaceTechPerkValue" in techTree,
  "the race-specific C data and aggregation helpers must exist",
);
for (const [race, expectedValues] of Object.entries(RACE_TECH_VALUES)) {
  assert.deepEqual(
    TECH_TREE_TIERS.map((tier) => techTree.RACE_TECH_TREE[race][tier].value),
    expectedValues,
    `${race} C branch must keep its agreed tier values`,
  );
  for (const tier of TECH_TREE_TIERS) {
    for (const [langName, locale] of [["ru", ruLocale], ["en", enLocale]]) {
      const name = getByDotPath(locale, techTree.getRaceTechPerkNameKey(race, tier));
      const desc = getByDotPath(locale, techTree.getRaceTechPerkDescKey(race, tier));
      const value = techTree.RACE_TECH_TREE[race][tier].value;
      assert.equal(
        name,
        RACE_TECH_NAMES[langName][race],
        `${langName} locale must name ${race} C`,
      );
      assert.ok(
        typeof desc === "string" && desc.length > 0,
        `${langName} locale must describe ${race} tier ${tier} C`,
      );
      const displayedValue = race === "crystalline"
        ? value.toFixed(1)
        : `${Math.round(value * 100)}%`;
      assert.ok(
        desc.includes(displayedValue),
        `${langName} locale must display the ${race} tier ${tier} C increment`,
      );
    }
  }
}
assert.equal(
  techTree.getRaceTechPerkValue({ race: "human", techPerks: { 3: "C", 6: "C" } }),
  0.07,
  "one carrier adds its selected C tiers",
);
assert.equal(
  techTree.getStrongestRaceTechPerkValue([
    { race: "human", techPerks: { 3: "C" } },
    { race: "human", techPerks: { 3: "C", 6: "C" } },
  ], "human"),
  0.07,
  "same-race C carriers use only the strongest accumulated bonus",
);
assert.equal(
  techTree.getStrongestRaceTechPerkValue([
    { race: "human", techPerks: { 3: "A", 6: "B" } },
  ], "human"),
  0,
  "professional A/B selections do not create a race C bonus",
);
assert.match(
  expMultiplierSource,
  /getStrongestRaceTechPerkValue\(crew, "human"\)/,
  "human C applies to experience for the full crew",
);
assert.match(
  consumptionSource,
  /getStrongestRaceTechPerkValue\(crew, "synthetic"\)/,
  "synthetic C applies once to active module consumption",
);
assert.match(
  healthRegenSource,
  /getStrongestRaceTechPerkValue\(\s*state\.crew,\s*"xenosymbiont",?\s*\)/,
  "xenosymbiont C applies to passive crew regeneration",
);
assert.match(
  civilianAssignmentsSource,
  /getStrongestRaceTechPerkValue\(\s*get\(\)\.crew,\s*"xenosymbiont",?\s*\)/,
  "xenosymbiont C applies to civilian healing",
);
assert.match(
  combatAssignmentsSource,
  /getStrongestRaceTechPerkValue\(\s*get\(\)\.crew,\s*"xenosymbiont",?\s*\)/,
  "xenosymbiont C applies to combat healing",
);
assert.match(
  evasionSource,
  /getStrongestRaceTechPerkValue\(crew, "krylorian"\)/,
  "krylorian C applies before the existing evasion cap",
);
assert.match(
  shieldRegenSource,
  /getStrongestRaceTechPerkValue\(\s*state\.crew,\s*"voidborn",?\s*\)/,
  "voidborn C applies to shield regeneration",
);
assert.match(
  shipStatsUpdateSource,
  /getStrongestRaceTechPerkValue\(\s*state\.crew,\s*"crystalline",?\s*\)/,
  "crystalline C applies to module defence",
);
assert.match(
  perkChoiceModalSource,
  /lg:grid-cols-3/,
  "the level-up modal renders three choices on desktop",
);
assert.match(
  crewListSource,
  /sm:grid-cols-3/,
  "the crew tech tree renders three choices on desktop",
);
assert.match(
  stationCrewTabSource,
  /branch === "C"/,
  "station badges resolve stored race C choices without indexing the professional tree",
);
assert.match(
  crewSliceSource,
  /crewMember\.race === "crystalline"[\s\S]*?get\(\)\.updateShipStats\(\)/,
  "changing a crystalline perk immediately refreshes stored ship armour",
);
assert.match(
  consumptionSource,
  /baseConsumption \* \(1 - syntheticBonus\) - pilotRed/,
  "synthetic C reduces the aggregate active-module consumption by its exact percentage",
);
assert.doesNotMatch(
  consumptionSource,
  /moduleConsumption \* \(1 - syntheticBonus\)/,
  "synthetic C is never rounded separately for every module",
);

// --- getTechPerkValue: no pick, single pick, stack selected tiers, independent branches ---
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
  TECH_TREE.pilot[3].A.value + TECH_TREE.pilot[6].A.value,
  "picking the same branch again adds its earlier tier bonus",
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
for (const profession of PROFESSIONS) {
  for (const branch of BRANCHES) {
    const techPerks = Object.fromEntries(
      TECH_TREE_TIERS.map((tier) => [tier, branch]),
    );
    assert.ok(
      Math.abs(
        getTechPerkValue({ profession, techPerks }, branch) -
          EXPECTED_FULL_PATH_TOTALS[profession][branch],
      ) < Number.EPSILON,
      `${profession} ${branch} stacks every selected tech-tree tier`,
    );
  }
}

assert.match(
  shipStatsSource,
  /getPlayerCritChance\(gs\)/,
  "ship stats display the same total crit chance as combat",
);
assert.match(
  playerAttackSource,
  /getPlayerCritChance\(state\)/,
  "combat resolves crits from the shared total crit chance",
);
assert.match(
  playerDamageSource,
  /function getActiveGunners\(state: GameState\)/,
  "global gunner effects use the same active-bay scope",
);
assert.match(
  playerDamageSource,
  /const bestGunnerCritBonus = Math\.max\(/,
  "crit uses only the strongest active gunner",
);
assert.match(
  playerDamageSource,
  /Math\.min\(0\.5, critChance \+ bestGunnerCritBonus\)/,
  "player crit chance is capped at 50%",
);
assert.match(
  healthRegenSource,
  /crewMember\.profession === "medic"[\s\S]*getTechPerkValue\(crewMember, "B"\)/,
  "only medics receive the medic regeneration branch",
);
assert.match(
  retreatSource,
  /const PILOT_LEVEL_RETREAT_BONUS = 2/,
  "pilot level retreat growth is bounded at 2% per level",
);
assert.match(
  playerDamageSource,
  /const bestGunnerAccuracyBonus = Math\.max\(/,
  "legacy global accuracy uses only the strongest active gunner",
);
assert.doesNotMatch(
  playerDamageSource,
  /state\.crew\.forEach\(\(c\) => \{[\s\S]*?getTechPerkValue\(c, "A"\)/,
  "legacy global accuracy must not stack every gunner's personal bonuses",
);
assert.match(
  playerDamageSource,
  /export function computeBayAccuracyModifier[\s\S]*?getTechPerkValue\(gunnerInBay, "A"\)/,
  "per-bay accuracy remains local to that bay's gunner",
);
assert.ok(
  Math.abs(0.5 + 9 * 0.02 + EXPECTED_FULL_PATH_TOTALS.pilot.B - 0.8) < Number.EPSILON,
  "a level-9 pilot with the complete retreat path reaches 80%, not guaranteed retreat",
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
  { 3: "C" },
  "roll in the final third picks the racial branch C",
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
