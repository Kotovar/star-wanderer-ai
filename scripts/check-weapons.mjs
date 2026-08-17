import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";

const scriptPath = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(scriptPath), "..");
const jiti = createRequire(import.meta.url)("jiti")(scriptPath, {
  alias: { "@": path.join(repoRoot, "src") },
});

function sourceOf(relativePath) {
  return readFileSync(path.join(repoRoot, relativePath), "utf8");
}

function load(target) {
  try {
    return jiti(target);
  } catch (error) {
    assert.fail(
      `${target} must load: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

const playerAttack = sourceOf("src/game/slices/combat/helpers/playerAttack.ts");
const playerDamage = sourceOf("src/game/slices/combat/helpers/playerDamage.ts");
const enemyCounterAttack = sourceOf(
  "src/game/slices/combat/helpers/enemyCounterAttack.ts",
);
const shipStats = sourceOf("src/game/components/ShipStats.tsx");
const combatPanel = sourceOf("src/game/components/CombatPanel.tsx");
const moduleTypes = sourceOf("src/game/types/modules.ts");
const removeWeapon = sourceOf("src/game/slices/services/helpers/removeWeapon.ts");
const crafting = sourceOf("src/game/constants/crafting.ts");
const combatTypes = sourceOf("src/game/types/combat.ts");
const weaponsDoc = sourceOf("docs/WEAPONS.md");
const ruLocale = JSON.parse(sourceOf("src/lib/locales/ru.json"));
const enLocale = JSON.parse(sourceOf("src/lib/locales/en.json"));

const {
  resolveProjectileHullDamage,
  processDronesDamage,
} = load("../src/game/slices/combat/helpers/playerDamage.ts");
const { getBossAttackModifiers } = load(
  "../src/game/slices/combat/helpers/bossAbilities.ts",
);

{
  const resolved = resolveProjectileHullDamage(
    [
      { weapon: "kinetic", outcome: "hull", shieldDamage: 0, hullDamage: 18 },
      { weapon: "quantum_torpedo", outcome: "hull", shieldDamage: 0, hullDamage: 55 },
    ],
    10,
    false,
  );
  assert.deepEqual(
    resolved.projectiles.map((projectile) => projectile.hullDamage),
    [13, 45],
    "each weapon family must use only its own armor penetration",
  );
  assert.equal(resolved.totalHullDamage, 58);
}

{
  const resolved = resolveProjectileHullDamage(
    [
      { weapon: "kinetic", outcome: "shield", shieldDamage: 18, hullDamage: 0 },
      { weapon: "quantum_torpedo", outcome: "hull", shieldDamage: 0, hullDamage: 55 },
    ],
    10,
    false,
  );
  assert.deepEqual(
    resolved.projectiles.map((projectile) => projectile.hullDamage),
    [0, 45],
    "a penetrator absorbed by shields must not weaken another weapon's armor check",
  );
}

{
  const previousRandom = Math.random;
  Math.random = () => 0;
  try {
    const projectiles = [];
    const result = processDronesDamage(2, 22, 1, 0, 0, 1, 0, projectiles);
    assert.deepEqual(
      projectiles.map((projectile) => projectile.hullDamage),
      [22, 24],
      "a drone hit must increase damage for the next drone in the same volley",
    );
    assert.equal(result.droneHitCount, 2);
  } finally {
    Math.random = previousRandom;
  }
}

assert.equal(
  getBossAttackModifiers(
    [{ health: 1, specialEffect: { type: "guaranteed_crit", value: 4 } }],
    4,
  ).isGuaranteedCrit,
  true,
  "the helper must recognize the fourth attack as a guaranteed crit",
);
assert.match(
  enemyCounterAttack,
  /bossAttackCount \?\? 0\) \+ 1/,
  "the counterattack must pass a one-based attack number to boss modifiers",
);

assert.match(
  playerAttack,
  /const currentTargetDefense =[\s\S]*?module\.id === tgtMod\.id/,
  "only the selected target's defense may be used for player weapon damage",
);
assert.match(
  playerAttack,
  /resolveProjectileHullDamage\(\s*damage\.projectiles,\s*currentTargetDefense,\s*combatFlags\.hasOverclock,?\s*\)/,
  "the selected target's defense must be passed to projectile armor resolution",
);
assert.match(
  playerAttack,
  /const canManuallyTarget = crewInWeaponBays\.some\([\s\S]*?profession === "gunner"/,
  "the resolver must gate target maps behind a living gunner",
);
assert.match(
  playerAttack,
  /applyBossTakeDamageEffects\(get\(\), set, get, finalModuleDamage, timeline\)/,
  "boss reactions must receive final post-armor hull damage",
);

assert.match(
  shipStats,
  /damage\.siege_torpedo/,
  "ShipStats must show Siege Torpedo damage",
);
assert.match(
  combatPanel,
  /siege_torpedo/,
  "CombatPanel must include Siege Torpedo in its damage math",
);
assert.match(
  combatPanel,
  /hasGunner && armedBayIds\.length > 0/,
  "the targeting progress must not imply that a gunnerless crew assigned targets",
);
assert.match(
  combatPanel,
  /!hasGunner && activeCombatPhase !== "counter"[\s\S]*?t\("combat\.no_gunner"\)/,
  "the combat phase must explain random targeting when no living gunner is present",
);
assert.match(
  moduleTypes,
  /weapons\?: \(Weapon \| null\)\[\];/,
  "weapon slots must accurately represent empty slots",
);
assert.doesNotMatch(
  removeWeapon,
  /as any/,
  "removing a weapon must not bypass the slot type",
);
assert.match(
  playerDamage,
  /health > 0/,
  "weapon bonuses must ignore dead crew",
);
assert.doesNotMatch(
  playerDamage,
  /Лазер:|Кинетика:|Квант\. торпеда:|Ионная пушка:/,
  "combat weapon logs must not be hard-coded in Russian",
);

assert.doesNotMatch(crafting, /Пробивает 25% брони/);
assert.doesNotMatch(crafting, /не повреждает корпус/);
assert.doesNotMatch(combatTypes, /\+5% damage per hit|max 20 stacks/);
assert.doesNotMatch(weaponsDoc, /один ролл на весь ход/);
assert.match(weaponsDoc, /каждая активная оружейная палуба делает свой бросок крита/);
assert.doesNotMatch(
  ruLocale.crafting.recipe_descriptions.plasma,
  /Пробивает 25%/,
);
assert.doesNotMatch(
  enLocale.crafting.recipe_descriptions.ion_cannon,
  /shields only/i,
);

console.log("Weapon correctness checks passed.");
