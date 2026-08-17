import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { existsSync, readFileSync } from "node:fs";

const scriptPath = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(scriptPath), "..");
const jiti = createRequire(import.meta.url)("jiti")(scriptPath, {
  alias: { "@": path.join(repoRoot, "src") },
});

let getPointDefenseChance;
let isInterceptableWeapon;
let getActivePointDefense;
let getModulePointDefenseChance;
let getPointDefenseOperatorBonus;
let formatPointDefenseChances;

function load(target) {
  try {
    return jiti(target);
  } catch (error) {
    assert.fail(
      `${target} must load: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

function sourceOf(relativePath) {
  return readFileSync(path.join(repoRoot, relativePath), "utf8");
}

const stationData = sourceOf("src/game/components/station/station-data.ts");
const shopConstants = sourceOf("src/game/slices/shop/constants.ts");
const crewConstants = sourceOf("src/game/constants/crew.ts");
const taskRequirements = sourceOf(
  "src/game/slices/crew/helpers/taskModuleRequirements.ts",
);
const raceConstants = sourceOf("src/game/constants/races.ts");
const moduleTypes = sourceOf("src/game/types/modules.ts");
const weaponConstants = sourceOf("src/game/constants/weapons.ts");
const playerAttackSource = sourceOf("src/game/slices/combat/helpers/playerAttack.ts");
const playerDamageSource = sourceOf("src/game/slices/combat/helpers/playerDamage.ts");
const enemyAttackSource = sourceOf(
  "src/game/slices/combat/helpers/enemyCounterAttack.ts",
);
const cinematicTypes = sourceOf("src/game/types/combatCinematics.ts");
const cinematicStage = sourceOf("src/game/components/CombatCinematicStage.tsx");
const cinematicPlayback = sourceOf(
  "src/game/slices/combat/helpers/combatCinematicPlayback.ts",
);
const shipGrid = sourceOf("src/game/components/ShipGrid.tsx");
const combatPanel = sourceOf("src/game/components/CombatPanel.tsx");
const shipStats = sourceOf("src/game/components/ShipStats.tsx");
const moduleArt = sourceOf("src/game/components/moduleArt.ts");
const moduleList = sourceOf("src/game/components/ModuleList.tsx");
const shopTab = sourceOf("src/game/components/station/ShopTab.tsx");
const ruLocale = sourceOf("src/lib/locales/ru.json");
const enLocale = sourceOf("src/lib/locales/en.json");
const weaponsDoc = sourceOf("docs/WEAPONS.md");
const crewAssignmentsDoc = sourceOf("docs/CREW_ASSIGNMENTS.md");

try {
  ({
    getPointDefenseChance,
    isInterceptableWeapon,
    getActivePointDefense,
    getModulePointDefenseChance,
    getPointDefenseOperatorBonus,
    formatPointDefenseChances,
  } = jiti(
    "../src/game/slices/combat/helpers/pointDefense.ts",
  ));
} catch {
  assert.fail("point-defense helper must exist");
}
const { generateEnemyModules } = load(
  "../src/game/slices/combat/helpers/combatSetup.ts",
);

assert.equal(
  getPointDefenseChance("missile", { level: 1 }),
  0.2,
  "level-one point defense intercepts a standard missile 20% of the time",
);
assert.equal(
  getPointDefenseChance("siege_torpedo", { level: 3 }),
  0.55,
  "a level-three point defense benefits from the slow torpedo profile",
);
assert.equal(
  getPointDefenseChance("quantum_torpedo", { level: 3 }),
  0.18,
  "level-three point defense keeps quantum interception below standard missiles",
);
assert.equal(
  isInterceptableWeapon("laser"),
  false,
  "point defense must not affect non-missile weapons",
);

assert.equal(
  (stationData.match(/id: "point-defense-\d"/g) ?? []).length,
  3,
  "point defense must be sold at each of the three module levels",
);
assert.doesNotMatch(
  shopConstants,
  /"point_defense"/,
  "point defense modules must be installable more than once",
);
assert.ok(
  crewConstants.includes('value: "interception"'),
  "a gunner must be able to operate point defense",
);
assert.match(
  taskRequirements,
  /interception:\s*\["point_defense"\]/,
  "the interception task must require point defense",
);
assert.match(
  raceConstants,
  /point_defense:\s*\{[\s\S]*?pointDefense:\s*10/,
  "xenosymbiont fusion must add 10 percentage points to point defense",
);
assert.equal(
  getPointDefenseChance("missile", { level: 1, operatorBonus: 0.05 }),
  0.25,
  "the gunner task adds its interception bonus",
);
assert.ok(
  Math.abs(getModulePointDefenseChance("missile", [
    { id: 1, type: "point_defense", health: 100, level: 1 },
    { id: 2, type: "point_defense", health: 100, level: 1 },
  ]) - 0.3) < 1e-9,
  "a second point-defense module contributes half as much as the first",
);
for (const threat of [1, 2]) {
  assert.equal(
    generateEnemyModules(threat, "raider").filter(
      (module) => module.weaponKind === "missile_launcher",
    ).length,
    1,
    `a threat-${threat} raider must carry one weak missile launcher`,
  );
}
assert.ok(
  Math.abs(getPointDefenseChance("missile", { level: 1, mergeBonus: 0.1 }) - 0.3) < 1e-9,
  "xenosymbiont fusion adds its interception bonus",
);
assert.equal(
  generateEnemyModules(2, "pirate").filter((module) => module.type === "point_defense").length,
  0,
  "low-threat enemies must not receive point defense",
);
for (const enemyType of ["pirate", "raider", "marauder"]) {
  assert.equal(
    generateEnemyModules(3, enemyType).filter(
      (module) => module.type === "point_defense",
    ).length,
    1,
    `${enemyType} must receive exactly one simplified point-defense module`,
  );
}
assert.equal(
  generateEnemyModules(6, "human_guard").some(
    (module) => module.type === "point_defense",
  ),
  false,
  "guards and bosses stay outside the simplified point-defense rule",
);
const disabledDefense = generateEnemyModules(3, "pirate");
const defense = disabledDefense.find((module) => module.type === "point_defense");
assert.ok(defense, "eligible enemies must expose a targetable point-defense module");
assert.equal(getActivePointDefense(disabledDefense)?.id, defense.id);
defense.health = 0;
assert.equal(
  getActivePointDefense(disabledDefense),
  undefined,
  "destroying point defense must disable interception",
);
assert.equal(
  getModulePointDefenseChance("missile", disabledDefense),
  0,
  "missiles must not be intercepted without an active point-defense module",
);
assert.equal(
  getModulePointDefenseChance("missile", generateEnemyModules(3, "pirate")),
  0.2,
  "an active simplified point-defense module must retain its 20% missile chance",
);
assert.equal(
  getPointDefenseOperatorBonus(
    [{ health: 100, level: 3, moduleId: 7, combatAssignment: "interception" }],
    [{ id: 7, type: "point_defense", health: 100, level: 1 }],
  ),
  0.07,
  "a point-defense gunner adds 5 percentage points plus 1 per crew level",
);
assert.doesNotMatch(
  sourceOf("src/game/slices/combat/helpers/playerDamage.ts"),
  /interceptChance \?\? 0\.2/,
  "missile damage must not create a universal interception chance",
);
assert.match(
  playerAttackSource,
  /getModulePointDefenseChance/,
  "player attacks must read the living enemy point-defense module",
);
assert.match(
  enemyAttackSource,
  /getPointDefenseOperatorBonus/,
  "enemy missile volleys must use the player gunner assignment",
);
assert.match(
  enemyAttackSource,
  /!combat\.enemy\.bossId[\s\S]*?!combat\.enemy\.spaceMonsterType/,
  "point defense must not classify boss and creature attacks as basic missiles",
);
assert.match(
  moduleTypes,
  /\| "siege_torpedo"/,
  "the slow siege torpedo must be a real weapon type",
);
assert.match(
  weaponConstants,
  /siege_torpedo:\s*\{[\s\S]*?damage:\s*96/,
  "the siege torpedo must deal its planned heavy damage",
);
assert.match(
  stationData,
  /id: "weapon-siege-torpedo"/,
  "the siege torpedo must be sold in the normal weapon pool",
);
assert.match(
  playerAttackSource,
  /processSiegeTorpedoDamage/,
  "siege torpedoes must resolve through the combat damage path",
);
assert.match(
  playerAttackSource,
  /getInterceptChance\("siege_torpedo"\)/,
  "point defense must receive the high siege-torpedo interception profile",
);
assert.match(
  playerAttackSource,
  /getInterceptChance\("quantum_torpedo"\)/,
  "point defense must receive the lower quantum-torpedo interception profile",
);
assert.ok(
  existsSync(path.join(repoRoot, "public/assets/weapons/siege_torpedo.webp")),
  "the siege torpedo needs a project-owned art asset",
);
assert.ok(
  existsSync(path.join(repoRoot, "public/assets/modules/point_defense-1x1.webp")),
  "point defense needs a project-owned module art asset",
);
assert.match(
  moduleArt,
  /point_defense:\s*\{\s*"1x1": "\/assets\/modules\/point_defense-1x1\.webp"/,
  "point defense must use its art in every module preview and dialog",
);
assert.match(
  moduleList,
  /point_defense:\s*t\("module_names\.point_defense"\)/,
  "the module list must not show the raw point_defense key",
);
assert.match(
  shopTab,
  /point_defense:\s*"module_names\.point_defense"/,
  "the station must not show the raw point_defense key",
);
assert.match(
  ruLocale,
  /"missile_feature": "Высокий урон, пробивает 35% брони; ракеты сбивает только активное ПВО"/,
  "the missile description must describe point defense instead of shields",
);
assert.match(
  ruLocale,
  /"siege_torpedo_feature": "/,
  "the siege torpedo needs a Russian feature description",
);
assert.match(
  enLocale,
  /"siege_torpedo_feature": "/,
  "the siege torpedo needs an English feature description",
);
const pirateWeapons = generateEnemyModules(3, "pirate").filter(
  (module) => module.type === "weapon",
);
assert.equal(
  pirateWeapons.filter((module) => module.weaponKind === "missile_launcher").length,
  1,
  "eligible ordinary enemies must receive one missile-launcher weapon module",
);
assert.match(
  enemyAttackSource,
  /weaponKind === "missile_launcher"/,
  "player point defense must only intercept a missile-launcher module",
);
assert.match(
  cinematicTypes,
  /interceptorModuleId\?: number/,
  "an intercepted projectile must retain the point-defense source module",
);
assert.match(
  cinematicStage,
  /event\.interceptorModuleId/,
  "the interception animation must start at the point-defense module",
);
assert.match(
  cinematicPlayback,
  /event\.weapon === "siege_torpedo"/,
  "the siege-torpedo animation must be slower than a normal projectile",
);
assert.match(
  shipGrid,
  /moduleArt/,
  "the ship grid must render point defense through the module image",
);
assert.doesNotMatch(
  shipGrid,
  /PointDefenseOverlay/,
  "the ship grid must not draw a second point-defense icon over its image",
);
assert.match(
  shipStats,
  /getModulePointDefenseChance\("missile", pointDefenseModules/,
  "ship telemetry must show the combined missile-interception chance",
);
assert.match(
  combatPanel,
  /module\.defense/,
  "enemy target cards must show armor",
);
assert.match(
  combatPanel,
  /module\.damage/,
  "enemy target cards must show damage",
);
assert.match(
  weaponsDoc,
  /Осадная торпеда[\s\S]*?96[\s\S]*?50%/,
  "weapons documentation must describe the normal-pool siege torpedo",
);
assert.match(
  weaponsDoc,
  /Ракетное[\s\S]*?20%[\s\S]*?Осадная торпеда[\s\S]*?45%[\s\S]*?Квантовая торпеда[\s\S]*?8%/,
  "weapons documentation must list all three point-defense profiles",
);
assert.match(
  crewAssignmentsDoc,
  /interception[\s\S]*?point_defense/,
  "crew documentation must describe the dedicated point-defense assignment",
);

// ─── Регрессии по найденным багам ─────────────────────────────────────────────

assert.equal(
  getActivePointDefense([
    { id: 1, type: "point_defense", health: 100, level: 1 },
    { id: 2, type: "point_defense", health: 100, level: 3 },
  ])?.id,
  2,
  "the interceptor animation must launch from the strongest live point defense",
);
assert.equal(
  formatPointDefenseChances({ level: 9 }),
  "50/70/20",
  "displayed interception chances must respect the per-weapon caps",
);
assert.equal(
  formatPointDefenseChances(),
  "20/45/8",
  "a level-one module must advertise all three profiles, not just the missile one",
);
assert.doesNotMatch(
  moduleList,
  /20 \+ Math\.max\(0, \(module\.level \?\? 1\) - 1\) \* 5/,
  "the module panel must not recompute interception chances by hand",
);
assert.doesNotMatch(
  combatPanel,
  /point_defense_chance", \{ chance: 20 \}/,
  "enemy point defense must not advertise a hardcoded missile-only chance",
);
assert.match(
  playerAttackSource,
  /resolveProjectileHullDamage\(/,
  "the attack resolver must delegate armor to the shared projectile resolver",
);
assert.match(
  playerDamageSource,
  /if \(projectile\.hullDamage <= 0\) return;/,
  "shield-only or intercepted shots must not enter an armor group",
);
assert.match(
  enemyAttackSource,
  /finalDamage \* launcherShare/,
  "intercepting the missile battery must remove its share of the multiplied damage",
);
assert.match(
  enemyAttackSource,
  /finalDamage <= 0\) \{\s*\n\s*recordMiss/,
  "a fully intercepted enemy volley must still be recorded as a miss",
);
assert.match(
  sourceOf("src/game/components/combatCinematicSound.ts"),
  /case "intercepted":\s*\n\s*return "combat_shield_break"/,
  "an intercepted shot must not play the hull-hit sound",
);

console.log("Point-defense checks passed.");
