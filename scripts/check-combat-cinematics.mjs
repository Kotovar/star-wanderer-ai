import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";

const scriptPath = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(scriptPath), "..");
// jiti — для модулей с расширениями-less импортами, которые node сам не резолвит
const jiti = createRequire(import.meta.url)("jiti")(scriptPath, {
  alias: { "@": path.join(repoRoot, "src") },
});

let createCombatTimelineCollector;
let buildVolleyEvents;
let finalizeProjectileHullDamage;
let splitVolleyAtHullDestruction;
let splitDamageByWeight;
let createCombatCinematicSnapshot;
let appendCombatSnapshotDeltaEvents;
let appendCombatSnapshotDamageEvents;
let appendCombatSnapshotSecondaryDamageEvents;
let applyCombatCinematicEvent;
let getCombatCinematicSnapshotAtProgress;
let getCombatCinematicEventDuration;
let getCombatCinematicStaggerMs;
let COMBAT_CINEMATIC_VOLLEY_STAGGER_MS;
let COMBAT_CINEMATIC_BAY_GAP_MS;
let getCombatCinematicSceneMetrics;
let getCombatCinematicModuleAnchor;
let formatCombatCinematicAmount;
let getMissLabelPoint;
let getProjectilePathPoint;
let getShieldImpactPoint;
let getCombatCinematicProjectileVisual;
let getCombatCinematicProjectileReadout;
let createCombatPresentationSnapshot;
let getPresentedCombat;

let stageSource;

try {
  stageSource = await readFile(
    new URL("../src/game/components/CombatCinematicStage.tsx", import.meta.url),
    "utf8",
  );
} catch {
  assert.fail(
    "CombatCinematicStage.tsx must provide the persistent, non-modal combat canvas",
  );
}
for (const marker of [
  "mechanicalBurst", "muzzleCharge", "smokeAlpha", "coronaRotation",
  "droneCount", "distortionRadius", "phaseOffset", "forkOffset",
]) {
  assert.match(stageSource, new RegExp(marker), "missing projectile identity: " + marker);
}
const { ANCIENT_BOSSES: cinematicBosses } = jiti(
  "../src/game/constants/bosses.ts",
);
const { SPACE_MONSTERS: cinematicSpaceMonsters } = jiti(
  "../src/game/constants/spaceMonsters.ts",
);
for (const enemyType of [
  "pirate",
  "raider",
  "mercenary",
  "marauder",
  "human_guard",
  "synthetic_guard",
  "xenosymbiont_guard",
  "krylorian_guard",
  "voidborn_guard",
  "crystalline_guard",
]) {
  assert.match(
    stageSource,
    new RegExp(`(?:"${enemyType}"|\\b${enemyType}:)`),
    `the cinematic stage gives ${enemyType} its own hull profile`,
  );
}
for (const spaceMonsterType of Object.keys(cinematicSpaceMonsters)) {
  assert.match(
    stageSource,
    new RegExp(`(?:"${spaceMonsterType}"|\\b${spaceMonsterType}:)`),
    `the cinematic stage gives ${spaceMonsterType} its own creature profile`,
  );
}
for (const { id: bossId } of cinematicBosses) {
  assert.match(
    stageSource,
    new RegExp(`(?:"${bossId}"|\\b${bossId}:)`),
    `the cinematic stage gives ${bossId} its own boss profile`,
  );
}
const combatPanelSource = await readFile(
  new URL("../src/game/components/CombatPanel.tsx", import.meta.url),
  "utf8",
);
const crewMemberCardSource = await readFile(
  new URL("../src/game/components/CrewMemberCard.tsx", import.meta.url),
  "utf8",
);
const enemyCounterAttackSource = await readFile(
  new URL("../src/game/slices/combat/helpers/enemyCounterAttack.ts", import.meta.url),
  "utf8",
);
const combatSliceSource = await readFile(
  new URL("../src/game/slices/combat/combatSlice.ts", import.meta.url),
  "utf8",
);
const enemyAttackSource = await readFile(
  new URL("../src/game/slices/combat/helpers/enemyAttack.ts", import.meta.url),
  "utf8",
);
const bossAbilitiesSource = await readFile(
  new URL("../src/game/slices/combat/helpers/bossAbilities.ts", import.meta.url),
  "utf8",
);
const playerAttackSource = await readFile(
  new URL("../src/game/slices/combat/helpers/playerAttack.ts", import.meta.url),
  "utf8",
);
const [eventPanelsSource, cinematicUiStoreSource, pageSource] = await Promise.all([
  readFile(new URL("../src/game/components/EventPanels.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/game/components/combatCinematicUiStore.ts", import.meta.url), "utf8"),
  readFile(new URL("../src/app/page.tsx", import.meta.url), "utf8"),
]);
const [ruTranslations, enTranslations] = await Promise.all([
  readFile(new URL("../src/lib/locales/ru.json", import.meta.url), "utf8").then(JSON.parse),
  readFile(new URL("../src/lib/locales/en.json", import.meta.url), "utf8").then(JSON.parse),
]);
const weaponsDoc = await readFile(new URL("../docs/WEAPONS.md", import.meta.url), "utf8");
const globalsSource = await readFile(new URL("../src/app/globals.css", import.meta.url), "utf8");

async function findRuntimeFastCombatReferences(
  directory,
  relativeDirectory = "",
){
  const references = [];
  const entries = await readdir(directory, { withFileTypes: true });

  for (const entry of entries) {
    const relativePath = `${relativeDirectory}${entry.name}`;
    if (entry.isDirectory()) {
      references.push(
        ...(await findRuntimeFastCombatReferences(
          new URL(`${entry.name}/`, directory),
          `${relativePath}/`,
        )),
      );
      continue;
    }
    if (relativePath === "game/saves/migrations.ts" || !/\.(?:ts|tsx|json)$/.test(entry.name)) {
      continue;
    }
    const source = await readFile(new URL(entry.name, directory), "utf8");
    if (/fastCombat|fast_combat|fast combat/i.test(source)) references.push(relativePath);
  }

  return references;
}

assert.match(
  stageSource,
  /const stageRef = useRef<HTMLDivElement>\(null\);/,
  "the canvas measures a stable stage instead of its own first animation frame",
);
assert.match(
  stageSource,
  /ref=\{stageRef\}/,
  "the cinematic canvas has a measured stage",
);
assert.match(
  stageSource,
  /stageRef\.current \?\? canvas\.parentElement \?\? canvas/,
  "portal timing falls back to the mounted canvas container instead of leaving it blank",
);
assert.match(
  stageSource,
  /const \[canvas, setCanvas\] = useState<HTMLCanvasElement \| null>\(null\);/,
  "the portal canvas becoming available retriggers cinematic playback",
);
assert.match(
  stageSource,
  /ref=\{setCanvas\}/,
  "the canvas ref is tied to the playback state",
);
assert.match(
  stageSource,
  /idleSnapshot: CombatCinematicSnapshot \| null;/,
  "the permanent scene accepts an idle snapshot before the first action",
);
assert.match(
  stageSource,
  /onPlaybackComplete: \(\) => void;/,
  "playback completion is automatic and owned by the persistent scene",
);
assert.doesNotMatch(
  stageSource,
  /\bDialog\b|\bonDismiss\b|combat_cinematics\.skip/,
  "the persistent scene has neither dialog chrome nor a manual skip path",
);
assert.match(
  stageSource,
  /const floatProgress = Math\.min\(progress \/ 0\.45, 1\);/,
  "damage numbers rise first and then remain readable above the ship",
);
assert.match(
  stageSource,
  /event\.sourceModuleId === undefined\s*\?\s*shipCenter\(event\.from, width, height\)\s*:\s*getModulePoint\(/,
  "an event without a source module keeps the ship-centre fallback",
);
assert.match(
  stageSource,
  /drawSelectedModuleTargets\(ctx, snapshot\.enemy, selectedModuleIds, active, width, height\);/,
  "the target reticle receives active timeline events",
);
assert.match(
  stageSource,
  /fillText\("MISS",/,
  "a real miss is labelled clearly instead of using an ambiguous symbol",
);
assert.match(
  stageSource,
  /combat_cinematics\.absorbed/,
  "a fully absorbed attack has its own readable outcome",
);
assert.match(
  stageSource,
  /combat_cinematics\.intercepted/,
  "an intercepted missile has its own readable outcome",
);
assert.match(
  stageSource,
  /drawInterceptor\(ctx, targetCenter, meetPoint, interceptFlight\);/,
  "an interception is a visible counter-missile launched by the defender",
);
assert.match(
  stageSource,
  /if \(interceptFlight >= 1\) return meetPoint;/,
  "the incoming shot stops where the counter-missile kills it instead of flying on",
);
assert.match(
  stageSource,
  /combat_cinematics\.reflected/,
  "a reflected attack has its own readable outcome",
);
assert.match(
  stageSource,
  /event\.outcome === "piercing"/,
  "shield-piercing attacks render as a bypass instead of a false shield breach",
);
assert.match(
  stageSource,
  /combat_cinematics\.blocked/,
  "a zero-damage armor block has a readable outcome",
);
assert.match(
  stageSource,
  /const shake = active\.reduce\(\(strongest, item\) => \{[\s\S]*?getCameraShake\(item\.event, item\.progress, elapsed\)/,
  "camera shake reacts to every impactful event, and overlapping shots shake by the strongest, not the sum",
);
assert.match(
  stageSource,
  /if \(event\.kind === "vessel_destroyed"\) return Math\.sin\([\s\S]*?\) \* 10 \* \(1 - progress\)/,
  "a destroyed vessel shakes the camera harder than a normal hit",
);
assert.match(
  stageSource,
  /if \(event\.outcome === "miss" \|\| event\.outcome === "intercepted"\) return 0;/,
  "an attack that never lands leaves the camera still",
);
assert.match(
  stageSource,
  /frameId = requestAnimationFrame\(loop\);/,
  "the idle scene keeps animating while the player picks an action",
);
assert.match(
  stageSource,
  /window\.matchMedia\("\(prefers-reduced-motion: reduce\)"\)\.matches\) \{\s*renderIdle\(\);/,
  "reduced motion renders the idle scene once instead of animating it",
);
assert.doesNotMatch(
  playerAttackSource,
  /\bplaySound\((?!"combat_no_active_weapons")/,
  "резолв залпа не играет звук сам — иначе он звучит до анимации",
);
assert.match(
  playerAttackSource,
  /playSound\("combat_no_active_weapons"\)/,
  "отказ действия звучит сразу: кинематики для него не будет",
);
assert.doesNotMatch(
  enemyCounterAttackSource,
  /\bplaySound\(/,
  "ответ врага не играет звук на этапе расчёта",
);
assert.match(
  combatSliceSource,
  /deferCombatSound\(\(\) =>\s*helpers\.executePlayerAttackWithBayTargets/,
  "ход с кинематикой глушит звук резолва — его отыграет сцена",
);
assert.match(
  combatSliceSource,
  /retreat: \(\) => CombatTurnTimeline \| null;/,
  "retreat returns a cinematic timeline when an enemy counterattack occurs",
);
assert.match(
  combatSliceSource,
  /retreat: \(\) => \{[\s\S]*?const initialSnapshot = createCombatCinematicSnapshot\(state\);[\s\S]*?helpers\.executeEnemyAttack\(set, get, timeline\)[\s\S]*?return timeline\.finish\(\);/,
  "a failed retreat records the enemy strike before advancing the combat round",
);
assert.match(
  combatPanelSource,
  /const handleRetreat = \(\) => \{[\s\S]*?const timeline = retreat\(\);[\s\S]*?setPlaybackCombat\(createCombatPresentationSnapshot\(presentedCombat\)\);[\s\S]*?startCombatPlayback\(timeline\);[\s\S]*?\};/,
  "the retreat button starts its returned counterattack timeline",
);
assert.match(
  combatPanelSource,
  /onClick=\{handleRetreat\}/,
  "the retreat button uses the cinematic action handler",
);
for (const spaceMonsterType of [
  "ember_wisp",
  "binary_wyrm",
  "plasma_leviathan",
]) {
  assert.match(
    stageSource,
    new RegExp(`spaceMonsterType === "${spaceMonsterType}"`),
    `${spaceMonsterType} uses the compact central module layout`,
  );
}
for (const marker of [
  "const serpents = [",
  "const segmentCount = 8;",
  "ctx.quadraticCurveTo",
  "ctx.fillRect(-3, -12, 6, 6);",
]) {
  assert.ok(
    stageSource.includes(marker),
    `the Binary Wyrm keeps its paired-serpent detail: ${marker}`,
  );
}
assert.match(
  stageSource,
  /playEventSounds\(item\.event, item\.index, active\[index\]\.progress\);/,
  "сцена дёргает звук по кадрам таймлайна, по каждому идущему событию",
);
assert.match(
  stageSource,
  /if \(impacted\.has\(index\) \|\| progress < getImpactProgress\(event\)\) return;/,
  "звук попадания играет один раз и ровно в момент контакта",
);
assert.match(
  stageSource,
  /if \(stage === "breached"\) drawHullBreach\(ctx, point, seed\);/,
  "уничтоженный модуль оставляет на корпусе пробоину до конца боя",
);
assert.match(
  stageSource,
  /drawHullDamage\(ctx, vessel, side, width, height\);/,
  "отметины рисуются поверх силуэта корабля, а не рядом с ним",
);
assert.match(
  stageSource,
  /drawBossIntent\(ctx, bossIntent, width, height, t, sceneScale\);/,
  "сцена телеграфирует способность босса до хода игрока",
);
assert.doesNotMatch(
  enemyCounterAttackSource,
  /export function performEnemyAttack\(\s*state: GameState,/,
  "the enemy turn does not run on the caller's pre-volley snapshot",
);
assert.match(
  enemyCounterAttackSource,
  /const state: GameState = get\(\);\s*\n\s*const combat = state\.currentCombat;/,
  "the enemy turn reads fresh state, so a weapon module destroyed this turn cannot fire back",
);
assert.doesNotMatch(
  playerAttackSource,
  /handleEnemyCounterAttack\(currentState/,
  "the player attack hands the enemy turn no stale state to fire from",
);
assert.match(
  enemyAttackSource,
  /module\.health > 0 \? \(module\.damage \?\? 0\) : 0/,
  "a destroyed enemy module contributes no damage",
);
assert.match(
  enemyCounterAttackSource,
  /pushEnemyProjectile\(timeline, tgt, 0, 0, false, "absorbed"\)/,
  "phase shield records absorption instead of a zero-damage shield hit",
);
assert.match(
  enemyCounterAttackSource,
  /appendCombatSnapshotSecondaryDamageEvents\(\s*timeline,\s*beforeDirectHit,\s*afterDirectHit,\s*volleyEvents,\s*\)/,
  "весь залп врага учитывается как объяснённый урон — иначе доли лишних стволов дают удар без выстрела",
);
assert.match(
  bossAbilitiesSource,
  /kind: "reflection"[\s\S]*timeline\?\.push\(reflectionEvent\)/,
  "a boss damage mirror emits a reflection for the cinematic",
);
assert.match(
  bossAbilitiesSource,
  /appendCombatSnapshotSecondaryDamageEvents\(/,
  "secondary module damage from a boss reflection stays in the cinematic timeline",
);
assert.match(
  playerAttackSource,
  /applyBossTakeDamageEffects\(get\(\), set, get, damage\.totalModuleDamage, timeline\)/,
  "the cinematic player attack passes its timeline to boss take-damage effects",
);
assert.match(
  playerAttackSource,
  /timeline\?\.push\(\{\s*kind: "vessel_destroyed",\s*side: "enemy",?\s*\}\);/,
  "victory by a destroyed core records the whole enemy vessel as destroyed",
);
assert.match(
  playerAttackSource,
  /if \(destroysEnemyVessel\) \{[\s\S]*?targetHullBeforeVolley: targetHealthBefore,/,
  "the real lethal target health limits the terminal volley's visible projectiles",
);
assert.match(
  playerAttackSource,
  /destroyedModuleIds = pushVolleyWithRetargets\(/,
  "shots left over after their target dies are re-aimed instead of hitting a wreck",
);
assert.match(
  playerAttackSource,
  /const spilledDamage = overkill\.reduce\(/,
  "the re-aimed shots deal their hull damage to the new module",
);
assert.match(
  playerAttackSource,
  /for \(const destroyedId of destroyedModuleIds\) \{/,
  "a shield module killed by re-aimed shots still recalculates the enemy shield pool",
);
assert.match(
  cinematicUiStoreSource,
  /startCombatPlayback: \(timeline: CombatTurnTimeline\) => void;/,
  "the presentation store exposes an explicit playback start action",
);
assert.match(
  cinematicUiStoreSource,
  /finishCombatPlayback: \(\) => void;/,
  "the presentation store exposes automatic playback completion",
);
assert.doesNotMatch(
  cinematicUiStoreSource,
  /showCombatCinematic|dismissCombatCinematic/,
  "the old user-dismiss presentation API is removed",
);
assert.match(
  eventPanelsSource,
  /const cinematicTimeline = useCombatCinematicUiStore\(\(s\) => s\.timeline\);/,
  "the event host observes a timeline that survives the combat state transition",
);
assert.match(
  eventPanelsSource,
  /if \(cinematicTimeline\) return <CombatPanel \/>;/,
  "the combat scene remains mounted until terminal playback finishes",
);
assert.doesNotMatch(
  pageSource,
  /CombatCinematicModal/,
  "the page no longer mounts a global combat modal",
);
assert.match(
  combatPanelSource,
  /import \{ CombatCinematicStage \} from "\.\/CombatCinematicStage";/,
  "the combat panel mounts the persistent canvas stage itself",
);
assert.match(
  combatPanelSource,
  /createCombatCinematicSnapshot/,
  "the permanent scene receives an idle snapshot from live combat state",
);
assert.match(
  combatPanelSource,
  /const isPlaybackActive = cinematicTimeline !== null;/,
  "one timeline boolean controls the combat input lock",
);
assert.doesNotMatch(
  combatPanelSource,
  /CombatShipGrid|CombatShipVisual/,
  "the legacy side-by-side vessel visuals are not rendered beside the canvas",
);
assert.match(
  combatPanelSource,
  /if \(isPlaybackActive\) return;/,
  "action handlers refuse a duplicate resolver call during playback",
);
assert.match(
  combatPanelSource,
  /disabled=\{isPlaybackActive \|\| !hasWeaponBay\}/,
  "attack is a real disabled button while playback runs",
);
assert.match(
  combatPanelSource,
  /disabled=\{isPlaybackActive\}/,
  "combat controls use the same playback lock",
);
assert.match(
  crewMemberCardSource,
  /disabled\?: boolean;/,
  "crew actions accept the combat playback lock",
);
assert.deepEqual(
  await findRuntimeFastCombatReferences(new URL("../src/", import.meta.url)),
  [],
  "Fast combat has no runtime state, UI, localization, or animation branch",
);
assert.doesNotMatch(
  weaponsDoc,
  /Быстрый бой|Fast combat/i,
  "weapon documentation no longer promises a fast combat mode",
);
assert.match(
  stageSource,
  /w-full aspect-\[4\/3\].*sm:aspect-\[16\/9\]/,
  "the persistent stage has a full-width mobile frame and a wider desktop frame",
);
assert.match(
  combatPanelSource,
  /flex gap-2\.5 flex-col sm:flex-row/,
  "combat actions stack on mobile and align on desktop",
);
const combatSceneMarkup = combatPanelSource.slice(
  combatPanelSource.indexOf(
    'return (\n    <div className="flex flex-col gap-4 h-full overflow-y-auto pr-2">',
  ),
);
assert.ok(
  combatSceneMarkup.indexOf("<CombatCinematicStage") <
    combatSceneMarkup.indexOf("<CombatPhaseStrip"),
  "the permanent canvas is the first substantial combat element instead of being pushed below tactical controls",
);
assert.ok(
  combatSceneMarkup.indexOf("{/* Attack actions */}") <
    combatSceneMarkup.indexOf("<BossAbilityCard"),
  "boss ability cards do not push primary combat actions below the fold",
);
assert.ok(
  combatSceneMarkup.indexOf("{/* Per-bay target selector */}") <
    combatSceneMarkup.indexOf("<BossAbilityCard"),
  "targeting stays next to combat actions instead of behind boss descriptions",
);
assert.doesNotMatch(
  combatPanelSource,
  /if \(!currentCombat\) \{\s*if \(!cinematicTimeline\) return null;\s*return \(\s*<CombatCinematicStage/,
  "terminal playback keeps the combat panel instead of replacing it with an isolated canvas",
);
assert.match(
  pageSource,
  /const showEventStage = mobileShowMap \|\| \(isMobile && \(inCombat \|\| cinematicTimeline !== null\)\);/,
  "a terminal combat timeline keeps the mobile event stage mounted",
);
assert.doesNotMatch(
  globalsSource,
  /\.combat-visual-stage/,
  "unused styling for the replaced side-by-side combat visuals is removed",
);
assert.equal(ruTranslations.combat_cinematics.absorbed, "ПОГЛОЩЕНО");
assert.equal(ruTranslations.combat_cinematics.intercepted, "ПЕРЕХВАЧЕН");
assert.equal(ruTranslations.combat_cinematics.reflected, "ОТРАЖЕНО");
assert.equal(enTranslations.combat_cinematics.absorbed, "ABSORBED");
assert.equal(ruTranslations.combat_cinematics.blocked, "БЛОКИРОВАНО");
assert.equal(enTranslations.combat_cinematics.blocked, "BLOCKED");

for (const translations of [ruTranslations, enTranslations]) {
  const weaponLabels = translations.combat_cinematics.weapons ?? {};
  const statusLabels = translations.combat_cinematics.statuses ?? {};
  for (const key of [
    "laser",
    "kinetic",
    "missile",
    "plasma",
    "drones",
    "antimatter",
    "quantum_torpedo",
    "ion_cannon",
    "enemy",
  ]) {
    assert.equal(
      typeof weaponLabels[key],
      "string",
      `the combat telemetry has a localized ${key} weapon label`,
    );
  }
  for (const key of [
    "shield",
    "hull",
    "mixed",
    "miss",
    "intercepted",
    "absorbed",
    "blocked",
    "piercing",
  ]) {
    assert.equal(
      typeof statusLabels[key],
      "string",
      `the combat telemetry has a localized ${key} outcome label`,
    );
  }
}

assert.doesNotMatch(
  combatPanelSource,
  /lastEnemyHit|lastPlayerHit|enemyFlash/,
  "the permanent scene does not duplicate attack feedback through legacy hit markers",
);

try {
  ({
    createCombatTimelineCollector,
    buildVolleyEvents,
    finalizeProjectileHullDamage,
    splitVolleyAtHullDestruction,
    splitDamageByWeight,
    createCombatCinematicSnapshot,
    appendCombatSnapshotDeltaEvents,
    appendCombatSnapshotDamageEvents,
    appendCombatSnapshotSecondaryDamageEvents,
  } = await import(
    "../src/game/slices/combat/helpers/combatTimeline.ts"
  ));
} catch {
  assert.fail(
    "combatTimeline.ts must provide the deterministic combat cinematic builder",
  );
}

try {
  ({
    getCombatCinematicProjectileVisual,
    getCombatCinematicProjectileReadout,
  } = await import("../src/game/components/combatCinematicPresentation.ts"));
} catch {
  assert.fail(
    "combatCinematicPresentation.ts must provide readable visual profiles for combat projectiles",
  );
}

try {
  ({
    createCombatPresentationSnapshot,
    getPresentedCombat,
  } = await import("../src/game/components/combatPresentationState.ts"));
} catch {
  assert.fail(
    "combatPresentationState.ts must preserve the pre-resolution combat UI during playback",
  );
}

try {
  ({
    applyCombatCinematicEvent,
    getCombatCinematicSnapshotAtProgress,
    getCombatCinematicEventDuration,
    getCombatCinematicStaggerMs,
    COMBAT_CINEMATIC_VOLLEY_STAGGER_MS,
    COMBAT_CINEMATIC_BAY_GAP_MS,
  } = await import(
    "../src/game/slices/combat/helpers/combatCinematicPlayback.ts"
  ));
} catch {
  assert.fail("combatCinematicPlayback.ts must provide deterministic canvas playback");
}

try {
  ({
    getCombatCinematicSceneMetrics,
    getCombatCinematicModuleAnchor,
    formatCombatCinematicAmount,
    getMissLabelPoint,
    getProjectilePathPoint,
    getShieldImpactPoint,
  } = await import("../src/game/components/combatCinematicGeometry.ts"));
} catch {
  assert.fail(
    "combatCinematicGeometry.ts must provide responsive scene and shield-impact geometry",
  );
}

{
  // Залп врага из нескольких орудий не должен порождать «удар без анимации»:
  // если учесть только первый снаряд, доли остальных стволов читаются как
  // необъяснённый урон и превращаются в лишнее событие damage.
  const snapshot = (shields, hull) => ({
    player: {
      kind: "player_ship",
      name: "player",
      shields,
      maxShields: 40,
      modules: [{ id: 1, health: hull, maxHealth: 100 }],
    },
    enemy: {
      kind: "enemy_ship",
      name: "enemy",
      shields: 0,
      maxShields: 0,
      modules: [{ id: 1, health: 50, maxHealth: 50 }],
    },
  });
  const shot = (shieldDamage, hullDamage) => ({
    kind: "projectile",
    from: "enemy",
    to: "player",
    weapon: "enemy",
    targetModuleId: 1,
    outcome: shieldDamage > 0 && hullDamage > 0
      ? "shield_and_hull"
      : shieldDamage > 0 ? "shield" : "hull",
    shieldDamage,
    hullDamage,
    isCrit: false,
  });

  const volley = [shot(6, 4), shot(4, 3), shot(2, 2)];
  const before = snapshot(12, 100);
  const after = snapshot(0, 91);

  const collector = createCombatTimelineCollector(before);
  appendCombatSnapshotSecondaryDamageEvents(collector, before, after, volley);
  assert.deepEqual(
    collector.finish().events,
    [],
    "залп из трёх орудий объясняет весь свой урон сам — лишнего удара без выстрела нет",
  );

  const oneShotCollector = createCombatTimelineCollector(before);
  appendCombatSnapshotSecondaryDamageEvents(oneShotCollector, before, after, volley[0]);
  assert.ok(
    oneShotCollector.finish().events.length > 0,
    "учёт одного снаряда из залпа обязан оставлять необъяснённый урон — иначе тест выше ничего не проверяет",
  );
}

{
  // Залп врага дробится только на показ: сумма долей обязана совпасть с уже
  // посчитанным уроном, иначе дробление само по себе меняет баланс.
  const shares = splitDamageByWeight([60, 25, 20], 87);
  assert.equal(
    shares.reduce((sum, value) => sum + value, 0),
    87,
    "доли орудий в сумме дают ровно тот урон, который уже посчитан",
  );
  assert.deepEqual(
    shares,
    [50, 21, 16],
    "урон делится пропорционально силе орудий, остаток уходит крупнейшей доле",
  );
  assert.deepEqual(
    splitDamageByWeight([1, 1, 1], 2),
    [1, 1, 0],
    "когда урона меньше, чем стволов, лишние стволы получают ноль, а не единицу из воздуха",
  );
  assert.deepEqual(
    splitDamageByWeight([50, 50], 0),
    [0, 0],
    "нулевой урон не порождает выстрелов с уроном",
  );
  assert.deepEqual(
    splitDamageByWeight([0, 0], 10),
    [0, 0],
    "без живых орудий делить нечего",
  );
}

{
  const { getBossAbilityTurnsUntilReady } = jiti(
    "../src/game/slices/combat/helpers/bossAbilities.ts",
  );
  const { getBossAbilityIntent } = jiti(
    "../src/game/slices/combat/helpers/bossIntent.ts",
  );
  const { ANCIENT_BOSSES: allBosses } = jiti("../src/game/constants/bosses.ts");

  // Счётчик атак инкрементится ДО применения способности, поэтому «сработает
  // сейчас» — это (count + 1) % period === 0.
  assert.equal(getBossAbilityTurnsUntilReady({}, 0), 0, "способность без периода бьёт каждый ход");
  assert.deepEqual(
    [0, 1, 2, 3, 4, 5].map((count) => getBossAbilityTurnsUntilReady({ everyTurns: 3 }, count)),
    [2, 1, 0, 2, 1, 0],
    "период 3 отсчитывается ровно до того хода, в который способность реально бьёт",
  );

  // Описание способности — контракт с игроком: если оно обещает «каждый N-й
  // ход», в данных обязан стоять everyTurns, иначе она бьёт каждый ход.
  for (const boss of allBosses) {
    const ability = boss.specialAbility;
    const promised = /Кажд\w+ (\d+)-й ход/.exec(ability?.description ?? "");
    if (!promised) continue;
    assert.equal(
      ability.everyTurns,
      Number(promised[1]),
      `${boss.name}: «${ability.name}» обещает каждый ${promised[1]}-й ход — период должен стоять в данных`,
    );
  }

  // Описание способности — контракт, который игрок читает в кодексе. Числа из
  // него закреплены здесь: значения `value` у разных эффектов означают разное
  // (шанс, урон, процент), и разъехаться они могут молча.
  const abilityContract = {
    "⚙️ Страж Врат": { effect: "shield_restore", value: 50, note: "50% щитов один раз за бой" },
    "🔥 Нова Сталкер": { effect: "aoe_damage", value: 20, everyTurns: 3, note: "20 урона каждый 3-й ход" },
    "🩸 Пустотный Паразит": { effect: "lifesteal", value: 20, note: "лечится на 20% нанесённого урона" },
    "🌀 Жнец Прайм": { effect: "emergency_repair", value: 25, note: "25% ПРОЦЕНТОВ прочности модулей" },
    "⚡ Фазовый Охотник": { effect: "evasion_boost", value: 30, note: "30% шанс избежать атаки" },
    "❄️ Ледяной Разоритель": { effect: "shield_regen", value: 30, note: "30 щитов каждый ход" },
    "👁️ Оракул Пустоты": { effect: "evasion_boost", value: 25, note: "25% шанс избежать урона" },
    "💀 Разрушитель Связи": { effect: "heal_all", value: 15, note: "15 ПРОЦЕНТОВ прочности каждый ход" },
    "⏳ Хранитель Времени": { effect: "self_heal", value: 40, note: "value для self_heal — ШАНС, 40%" },
    "♾️ Вечный": { effect: "resurrect_chance", value: 20, note: "20% шанс воскреснуть" },
  };

  for (const [name, want] of Object.entries(abilityContract)) {
    const boss = allBosses.find((item) => item.name === name);
    assert.ok(boss, `босс ${name} на месте`);
    assert.equal(boss.specialAbility.effect, want.effect, `${name}: эффект способности`);
    assert.equal(
      boss.specialAbility.value,
      want.value,
      `${name}: ${want.note} — число разъехалось с описанием`,
    );
    assert.equal(
      boss.specialAbility.everyTurns ?? null,
      want.everyTurns ?? null,
      `${name}: периодичность способности`,
    );
  }

  // emergency_repair лечит процентами, а не плоскими очками: на модуле в 220 HP
  // разница между «25» и «25%» — больше чем вдвое.
  // Плоское лечение осталось только там, где описание тоже говорит про очки:
  // вампиризм (% от урона уже посчитан), self_heal на 50 и базовый regenRate.
  assert.equal(
    (bossAbilitiesSource.match(/healAllBossModules\(set, /g) ?? []).length,
    3,
    "плоским лечением остаются только те способности, что обещают очки, а не проценты",
  );
  assert.equal(
    (bossAbilitiesSource.match(/healAllBossModulesByPercent\(set, healPercent\);/g) ?? []).length,
    3,
    "все три процентных лечения (экстренный ремонт и оба heal_all) считают процент",
  );

  const nova = allBosses.find((boss) => boss.name.includes("Нова Сталкер"));
  const intentAt = (count) =>
    getBossAbilityIntent({
      enemy: {
        isBoss: true,
        specialAbility: nova.specialAbility,
        modules: [{ health: 100, maxHealth: 100 }],
        bossAttackCount: count,
      },
      bossOneShotAbilityFired: false,
    });
  assert.deepEqual(
    [0, 1, 2].map((count) => intentAt(count).status),
    ["pending", "pending", "imminent"],
    "телеграф обещает удар в тот ход, в который он прилетает, а не каждый ход",
  );
  assert.equal(intentAt(0).turnsUntil, 2, "телеграф называет, сколько ходов осталось");
}

{
  const { WEAPON_TYPES } = jiti("../src/game/constants/weapons.ts");
  const playerDamageOrder = [
    ...playerAttackSource.matchAll(/if \(weaponCounts\.(\w+) > 0\) \{/g),
  ].map((match) => match[1]);

  assert.equal(
    playerDamageOrder[0],
    "ion_cannon",
    "ионная пушка (×4 по щитам) стреляет первой, а не по уже сбитым щитам",
  );
  const shieldBonusOf = (weapon) => WEAPON_TYPES[weapon].shieldBonus ?? 0;
  const bonuses = playerDamageOrder.map(shieldBonusOf);
  assert.deepEqual(
    [...bonuses].sort((a, b) => b - a),
    bonuses,
    "оружие резолвится по убыванию множителя по щитам: сначала снять барьер, потом бить корпус",
  );
}

{
  const { getHullDamageStage } = jiti(
    "../src/game/components/combatCinematicGeometry.ts",
  );

  assert.equal(getHullDamageStage(100, 100), "intact", "целый модуль не пачкает корпус");
  assert.equal(getHullDamageStage(50, 100), "intact", "половина прочности — ещё не повреждение");
  assert.equal(
    getHullDamageStage(30, 100),
    "scorched",
    "изувеченный, но живой модуль оставляет подпалину — предупреждение до пробоины",
  );
  assert.equal(
    getHullDamageStage(0, 100),
    "breached",
    "уничтоженный модуль оставляет пробоину",
  );
  assert.equal(
    getHullDamageStage(-5, 100),
    "breached",
    "отрицательная прочность — тоже пробоина, а не целый корпус",
  );
  assert.equal(
    getHullDamageStage(10, 0),
    "intact",
    "модуль без максимума прочности не делит на ноль",
  );
}

{
  // Сцена рисуется в своих координатах и масштабируется под канвас. Проверяем,
  // что на реальных экранах корабли, полоски и подписи остаются в кадре.
  const stageSize = (viewportWidth, viewportHeight, wide) => {
    const width = viewportWidth - 16;
    const byAspect = wide ? (width * 9) / 16 : (width * 3) / 4;
    const minHeight = wide
      ? Math.min(26.25 * 16, viewportHeight * 0.56)
      : Math.min(13 * 16, viewportHeight * 0.44);
    return { width: Math.floor(width), height: Math.floor(Math.max(byAspect, minHeight)) };
  };

  const devices = [
    ["iPhone SE", 375, 667, false],
    ["iPhone 14", 390, 844, false],
    ["Galaxy S8", 360, 740, false],
    ["узкий экран 320", 320, 568, false],
    ["iPad портрет", 768, 1024, true],
    ["десктоп", 1280, 800, true],
  ];

  // Те же числа, что и в CombatCinematicStage: корпус босса, щит, полоски.
  const BOSS_HULL_HALF_WIDTH = 148;
  const BOSS_SHIELD_RADIUS_X = 166;
  const SHIELD_PULSE_PEAK = 1.03;
  const BARS_BELOW_CENTER = 95 + 16;

  for (const [name, viewportWidth, viewportHeight, wide] of devices) {
    const stage = stageSize(viewportWidth, viewportHeight, wide);
    const scene = getCombatCinematicSceneMetrics(stage.width, stage.height);
    const enemyCenterX = scene.width * 0.75;
    const shipCenterY = scene.height * 0.52;
    const shieldRadiusX = Math.min(
      BOSS_SHIELD_RADIUS_X,
      (scene.width * 0.25 - 6) / SHIELD_PULSE_PEAK,
    );

    assert.ok(
      enemyCenterX + BOSS_HULL_HALF_WIDTH < scene.width,
      `${name}: корпус босса помещается по ширине`,
    );
    assert.ok(
      enemyCenterX + shieldRadiusX * SHIELD_PULSE_PEAK <= scene.width,
      `${name}: щит босса не срезается краем кадра даже в пике пульсации`,
    );
    assert.ok(
      scene.width * 0.25 - shieldRadiusX * SHIELD_PULSE_PEAK >= 0,
      `${name}: щит игрока не срезается левым краем`,
    );
    assert.ok(
      shipCenterY + BARS_BELOW_CENTER < scene.height,
      `${name}: полоски щита и корпуса не уезжают за нижний край`,
    );
    assert.ok(
      scene.height * 0.13 * scene.scale >= 12,
      `${name}: подпись корабля не прижата к верхнему краю`,
    );
    assert.ok(
      scene.scale >= 0.36,
      `${name}: масштаб не проваливается ниже читаемого минимума`,
    );
  }
}

{
  const {
    COMBAT_CINEMATIC_ENEMY_WEAPON_KEYS,
    getCombatCinematicEnemyWeaponKey,
    getCombatCinematicEnemyWeaponIcon,
  } = jiti("../src/game/components/combatCinematicPresentation.ts");
  const { ANCIENT_BOSSES: bosses } = jiti("../src/game/constants/bosses.ts");

  for (const key of COMBAT_CINEMATIC_ENEMY_WEAPON_KEYS) {
    assert.equal(
      typeof ruTranslations.combat_cinematics.enemy_weapons?.[key],
      "string",
      `у орудия «${key}» есть русское имя в телеметрии`,
    );
    assert.equal(
      typeof enTranslations.combat_cinematics.enemy_weapons?.[key],
      "string",
      `у орудия «${key}» есть английское имя в телеметрии`,
    );
  }

  // Новый ствол в данных обязан получить имя, иначе телеметрия молча
  // подпишет его общим «орудие врага».
  const bossGunTypes = new Set(
    bosses.flatMap((boss) =>
      boss.modules.filter((m) => (m.damage ?? 0) > 0).map((m) => m.type),
    ),
  );
  const unnamed = [...bossGunTypes].filter(
    (type) => !COMBAT_CINEMATIC_ENEMY_WEAPON_KEYS.includes(type),
  );
  assert.deepEqual(unnamed, [], "каждое орудие босса подписано в телеметрии");

  assert.equal(
    getCombatCinematicEnemyWeaponKey("reality_tear"),
    "reality_tear",
    "известное орудие подписывается своим именем",
  );
  assert.equal(
    getCombatCinematicEnemyWeaponKey("совершенно_новая_пушка"),
    "enemy",
    "незнакомое орудие откатывается на общую подпись, а не на сырой ключ",
  );
  assert.equal(
    getCombatCinematicEnemyWeaponKey(undefined),
    "enemy",
    "выстрел без указанного орудия подписывается общо",
  );
  assert.notEqual(
    getCombatCinematicEnemyWeaponIcon("ice_beam"),
    getCombatCinematicEnemyWeaponIcon("nano_swarm"),
    "иконка различает семейства орудий, а не одна на всех",
  );
}

{
  const { ANCIENT_BOSSES } = jiti("../src/game/constants/bosses.ts");
  const stats = (boss) => ({
    hull: boss.modules.reduce((sum, m) => sum + m.health, 0),
    damage: boss.modules.reduce((sum, m) => sum + (m.damage ?? 0), 0),
    guns: boss.modules.filter((m) => (m.damage ?? 0) > 0).length,
  });

  // Зафиксированный баланс: третий ствол T3 нарезан из существующих двух,
  // суммарный урон и прочность боссов не изменились.
  const expected = {
    "👁️ Оракул Пустоты": { hull: 1040, damage: 90, guns: 3 },
    "💀 Разрушитель Связи": { hull: 840, damage: 125, guns: 3 },
    "⏳ Хранитель Времени": { hull: 960, damage: 115, guns: 3 },
    "♾️ Вечный": { hull: 1050, damage: 125, guns: 3 },
  };
  for (const [name, want] of Object.entries(expected)) {
    const boss = ANCIENT_BOSSES.find((b) => b.name === name);
    assert.ok(boss, `босс ${name} на месте`);
    assert.deepEqual(
      stats(boss),
      want,
      `${name}: три ствола при неизменных суммарных уроне и прочности`,
    );
  }

  for (const boss of ANCIENT_BOSSES) {
    const guns = boss.modules.filter((m) => (m.damage ?? 0) > 0);
    assert.ok(guns.length >= 1, `${boss.name} умеет стрелять`);
    assert.deepEqual(
      guns.filter((gun) => (gun.defense ?? 0) > 0),
      [],
      `${boss.name}: орудия без брони — иначе новый ствол поднимает общий щит от брони врага`,
    );
  }
}

{
  const { getCombatCinematicEventSounds } = jiti(
    "../src/game/components/combatCinematicSound.ts",
  );
  const shot = {
    kind: "projectile",
    from: "player",
    to: "enemy",
    weapon: "laser",
    outcome: "hull",
    shieldDamage: 0,
    hullDamage: 7,
    isCrit: false,
  };
  assert.deepEqual(
    getCombatCinematicEventSounds(shot),
    { launch: "combat_laser", impact: "combat_hull_hit", accent: null },
    "выстрел и попадание — разные звуки, чтобы сцена могла развести их во времени",
  );
  assert.equal(
    getCombatCinematicEventSounds({ ...shot, outcome: "miss" }).impact,
    "combat_miss",
    "промах звучит промахом",
  );
  assert.equal(
    getCombatCinematicEventSounds({ ...shot, isCrit: true }).accent,
    "combat_critical",
    "крит добавляет акцент поверх попадания",
  );
  assert.equal(
    getCombatCinematicEventSounds({ ...shot, weapon: "enemy", from: "enemy", to: "player" }).launch,
    "combat_enemy_fire",
    "залп врага звучит своим выстрелом",
  );
}

{
  const { getBossAbilityIntent } = jiti(
    "../src/game/slices/combat/helpers/bossIntent.ts",
  );
  const combat = (ability, modules, oneShotFired = false) => ({
    enemy: { isBoss: true, specialAbility: ability, modules },
    bossOneShotAbilityFired: oneShotFired,
  });
  const healthy = [{ health: 100, maxHealth: 100 }];
  const wounded = [{ health: 20, maxHealth: 100 }];
  const everyTurn = { name: "Залп", description: "", trigger: "every_turn", effect: "aoe_damage" };
  const lowHealth = { name: "Ремонт", description: "", trigger: "low_health", effect: "emergency_repair" };
  const reactive = { name: "Уклонение", description: "", trigger: "every_turn", effect: "evasion_boost" };

  assert.equal(getBossAbilityIntent(null), null, "без боя намерения нет");
  assert.equal(
    getBossAbilityIntent({ enemy: { isBoss: false, modules: [] } }),
    null,
    "обычный враг не телеграфирует способность",
  );
  assert.equal(
    getBossAbilityIntent(combat(everyTurn, healthy)).status,
    "imminent",
    "способность каждого хода всегда предупреждает о следующем ходе",
  );
  assert.equal(
    getBossAbilityIntent(combat(lowHealth, healthy)).status,
    "armed",
    "низкоуровневая способность ждёт своего порога и честно это показывает",
  );
  assert.equal(
    getBossAbilityIntent(combat(lowHealth, wounded)).status,
    "imminent",
    "за порогом прочности та же способность становится угрозой на следующий ход",
  );
  assert.equal(
    getBossAbilityIntent(combat(lowHealth, wounded, true)).status,
    "spent",
    "одноразовая способность после срабатывания больше не пугает игрока",
  );
  assert.equal(
    getBossAbilityIntent(combat(reactive, healthy)).status,
    "reactive",
    "способность-ответ помечена как реакция, а не как ход врага",
  );
}

{
  const volley = [
    { weapon: "kinetic", outcome: "hull", shieldDamage: 0, hullDamage: 4 },
    { weapon: "kinetic", outcome: "hull", shieldDamage: 0, hullDamage: 4 },
    { weapon: "kinetic", outcome: "hull", shieldDamage: 0, hullDamage: 4 },
  ];
  assert.deepEqual(
    splitVolleyAtHullDestruction(volley, 6),
    { onTarget: volley.slice(0, 2), overkill: volley.slice(2) },
    "the volley splits right after the shot that empties the target's hull",
  );
  assert.deepEqual(
    splitVolleyAtHullDestruction(volley, 40),
    { onTarget: volley, overkill: [] },
    "a target that survives the volley keeps every shot",
  );
  assert.deepEqual(
    splitVolleyAtHullDestruction(volley, 12),
    { onTarget: volley, overkill: [] },
    "the shot that lands the exact killing blow still belongs to the original target",
  );
}

{
  const combatSnapshot = createCombatCinematicSnapshot({
    ship: {
      shields: 18,
      maxShields: 25,
      modules: [{ id: 1, health: 60, maxHealth: 60 }],
    },
    currentCombat: {
      enemy: {
        name: "Живой улей",
        isBoss: false,
        spaceMonsterType: "void_ray",
        shields: 0,
        maxShields: 0,
        modules: [
          { id: 9, health: 40, maxHealth: 40, isBiological: true },
        ],
      },
    },
  });

  assert.deepEqual(
    combatSnapshot,
    {
      player: {
        kind: "player_ship",
        name: "player",
        shields: 18,
        maxShields: 25,
        modules: [{ id: 1, health: 60, maxHealth: 60 }],
      },
      enemy: {
        kind: "creature",
        name: "Живой улей",
        spaceMonsterType: "void_ray",
        shields: 0,
        maxShields: 0,
        modules: [{ id: 9, health: 40, maxHealth: 40 }],
      },
    },
    "a combat snapshot preserves the visual side and creature model",
  );
}

{
  const guardSnapshot = createCombatCinematicSnapshot({
    ship: { shields: 0, maxShields: 0, modules: [] },
    currentCombat: {
      enemy: {
        name: "Страж людей",
        enemyType: "human_guard",
        shields: 0,
        maxShields: 0,
        modules: [],
      },
    },
  });
  const bossSnapshot = createCombatCinematicSnapshot({
    ship: { shields: 0, maxShields: 0, modules: [] },
    currentCombat: {
      enemy: {
        name: "Страж Врат",
        isBoss: true,
        bossId: "guardian_sentinel",
        shields: 0,
        maxShields: 0,
        modules: [],
      },
    },
  });

  assert.equal(
    guardSnapshot?.enemy.enemyType,
    "human_guard",
    "a race guard keeps its hull identity in the cinematic snapshot",
  );
  assert.equal(
    bossSnapshot?.enemy.bossId,
    "guardian_sentinel",
    "a boss keeps its hull identity in the cinematic snapshot",
  );
}

{
  const liveCombat = {
    enemy: {
      name: "Древний страж",
      modules: [{ id: 9, name: "Ядро", health: 40, maxHealth: 40 }],
      selectedModule: 9,
      shields: 20,
      maxShields: 20,
      isBoss: true,
      specialAbility: {
        name: "Поглощение материи",
        description: "Восстанавливает корпус",
      },
    },
    loot: { credits: 100 },
    round: 4,
    droneStacks: 3,
  };
  const presentationCombat = createCombatPresentationSnapshot(liveCombat);

  liveCombat.enemy.name = "Уничтожен";
  liveCombat.enemy.modules[0].health = 0;

  assert.equal(
    presentationCombat.enemy.name,
    "Древний страж",
    "playback retains the enemy header captured before terminal resolution",
  );
  assert.equal(
    presentationCombat.enemy.modules[0].health,
    40,
    "playback retains target data even after the live combat state is resolved",
  );
  assert.equal(
    presentationCombat.enemy.specialAbility?.name,
    "Поглощение материи",
    "playback retains boss cards until the animation completes",
  );
  assert.strictEqual(
    getPresentedCombat(null, presentationCombat, true),
    presentationCombat,
    "a terminal live state keeps its combat UI snapshot during playback",
  );
  assert.equal(
    getPresentedCombat(null, presentationCombat, false),
    null,
    "the terminal result can replace combat UI only after playback ends",
  );
}

const weaponOrder = [
  "laser",
  "kinetic",
  "missile",
  "plasma",
  "drones",
  "antimatter",
  "quantum_torpedo",
  "ion_cannon",
];

{
  const profiles = weaponOrder.map((weapon) =>
    getCombatCinematicProjectileVisual(weapon),
  );

  assert.deepEqual(
    profiles,
    ["beam", "tracer", "rocket", "plasma", "swarm", "orbit", "phase", "arc"],
    "every weapon type has its own readable projectile profile",
  );
  assert.equal(
    new Set(profiles).size,
    weaponOrder.length,
    "weapon animations do not collapse into the same generic projectile",
  );
  assert.deepEqual(
    getCombatCinematicProjectileReadout("shield_and_hull", 20, 5),
    { status: "mixed", shieldDamage: 20, hullDamage: 5 },
    "a mixed hit retains separate shield and hull values for the telemetry strip",
  );
  assert.deepEqual(
    getCombatCinematicProjectileReadout("piercing", 8, 12),
    { status: "piercing", shieldDamage: 8, hullDamage: 12 },
    "a shield bypass remains visibly distinct from an ordinary mixed hit",
  );
  assert.deepEqual(
    getCombatCinematicProjectileReadout("miss", 0, 0),
    { status: "miss", shieldDamage: 0, hullDamage: 0 },
    "a non-damaging result has a dedicated readable status",
  );
}

const snapshot = {
  player: {
    kind: "player_ship",
    name: "Скиталец",
    shields: 20,
    maxShields: 20,
    modules: [{ id: 1, health: 60, maxHealth: 60 }],
  },
  enemy: {
    kind: "enemy_ship",
    name: "Рейдер",
    shields: 10,
    maxShields: 10,
    modules: [{ id: 9, health: 40, maxHealth: 40 }],
  },
};

{
  const compactScene = getCombatCinematicSceneMetrics(304, 228);

  assert.deepEqual(
    compactScene,
    { scale: 0.475, width: 640, height: 480 },
    "a narrow 304 px scene uses the full desktop composition at a fitting scale",
  );
}

{
  assert.deepEqual(
    getCombatCinematicSceneMetrics(1280, 720),
    { scale: 2, width: 640, height: 360 },
    "a 16:9 desktop scene scales the combat composition instead of leaving the vessels undersized",
  );
}

{
  assert.equal(
    typeof getCombatCinematicModuleAnchor,
    "function",
    "combat geometry exposes one shared anchor layout for every module effect",
  );
  const center = { x: 160, y: 180 };

  for (const moduleCount of [7, 22]) {
    const anchors = Array.from({ length: moduleCount }, (_, moduleIndex) =>
      getCombatCinematicModuleAnchor(moduleCount, moduleIndex, center, 1),
    );

    assert.equal(
      new Set(anchors.map(({ x, y }) => `${x}:${y}`)).size,
      moduleCount,
      `all ${moduleCount} module anchors remain distinct`,
    );
    assert.ok(
      anchors.every(
        ({ x, y }) => Math.abs(x - center.x) <= 52 && Math.abs(y - center.y) <= 36,
      ),
      `all ${moduleCount} module anchors stay inside the shared ship silhouette`,
    );
  }

  const creatureCoreAnchors = Array.from({ length: 6 }, (_, moduleIndex) =>
    getCombatCinematicModuleAnchor(
      6,
      moduleIndex,
      center,
      1,
      { halfWidth: 28, halfHeight: 22 },
    ),
  );
  assert.ok(
    creatureCoreAnchors.every(({ x, y }) =>
      Math.hypot(x - center.x, y - center.y) <= 38
    ),
    "compact creature module anchors fit inside the visible core",
  );
}

{
  assert.equal(
    formatCombatCinematicAmount(2.5),
    3,
    "a fractional cinematic hit is displayed as a whole number",
  );
  assert.equal(
    formatCombatCinematicAmount(0.01),
    1,
    "a positive hit never renders as zero damage",
  );
}

{
  const targetCenter = { x: 480, y: 180 };

  assert.deepEqual(
    getMissLabelPoint(targetCenter, 0.58),
    { x: 480, y: 180 },
    "MISS starts from the center of the ship it missed",
  );
  assert.deepEqual(
    getMissLabelPoint(targetCenter, 1),
    { x: 480, y: 116 },
    "MISS rises vertically above the missed ship instead of following the projectile",
  );
}

{
  const source = { x: 160, y: 180 };
  const shieldCenter = { x: 480, y: 180 };
  const moduleTarget = { x: 442, y: 157 };
  const shieldImpact = getShieldImpactPoint(
    source,
    moduleTarget,
    shieldCenter,
    148,
    86,
  );
  const lineCrossProduct = (point) =>
    (point.x - source.x) * (moduleTarget.y - source.y) -
    (point.y - source.y) * (moduleTarget.x - source.x);

  assert.ok(
    Math.abs(lineCrossProduct(shieldImpact)) < 0.000001,
    "a shield impact for an off-center module remains on the laser line",
  );
  assert.ok(
    Math.abs(
      ((shieldImpact.x - shieldCenter.x) / 148) ** 2 +
        ((shieldImpact.y - shieldCenter.y) / 86) ** 2 -
        1,
    ) < 0.000001,
    "the straight laser meets the actual shield boundary",
  );
  assert.deepEqual(
    getProjectilePathPoint(source, shieldImpact, moduleTarget, "shield", 1),
    shieldImpact,
    "a shield-only hit stops at the barrier instead of reaching the hull",
  );
  assert.deepEqual(
    getProjectilePathPoint(source, shieldImpact, moduleTarget, "absorbed", 1),
    shieldImpact,
    "a phase shield absorption stops the projectile at the barrier",
  );
  assert.deepEqual(
    getProjectilePathPoint(source, shieldImpact, moduleTarget, "hull", 0.62),
    moduleTarget,
    "a direct hit reaches the hull before its damage number begins to rise",
  );
  assert.deepEqual(
    getProjectilePathPoint(source, shieldImpact, moduleTarget, "shield_and_hull", 0.68),
    shieldImpact,
    "a penetrating hit reaches the shield before entering the hull",
  );
  assert.deepEqual(
    getProjectilePathPoint(source, shieldImpact, moduleTarget, "shield_and_hull", 1),
    moduleTarget,
    "a penetrating hit reaches the selected module only after breaching the shield",
  );
  assert.ok(
    Math.abs(
      lineCrossProduct(
        getProjectilePathPoint(
          source,
          shieldImpact,
          moduleTarget,
          "shield_and_hull",
          0.72,
        ),
      ),
    ) < 0.000001,
    "a penetrating laser does not bend after crossing the shield",
  );
}

{
  const collector = createCombatTimelineCollector(snapshot);
  appendCombatSnapshotDeltaEvents(
    collector,
    snapshot,
    {
      player: {
        ...snapshot.player,
        modules: [{ id: 1, health: 0, maxHealth: 60 }],
      },
      enemy: {
        ...snapshot.enemy,
        shields: 15,
        modules: [{ id: 9, health: 47, maxHealth: 40 }],
      },
    },
    "regen",
  );

  assert.deepEqual(
    collector.finish().events,
    [
      { kind: "module_destroyed", side: "player", moduleId: 1 },
      {
        kind: "heal",
        side: "enemy",
        amount: 7,
        moduleIds: [9],
        source: "regen",
      },
      {
        kind: "shield_restore",
        side: "enemy",
        amount: 5,
        source: "regen",
      },
    ],
    "state deltas preserve module loss, hull repair, and shield regeneration",
  );
}

{
  assert.equal(
    typeof appendCombatSnapshotDamageEvents,
    "function",
    "boss damage effects can be derived from their real state delta",
  );
  const collector = createCombatTimelineCollector(snapshot);
  appendCombatSnapshotDamageEvents(
    collector,
    snapshot,
    {
      ...snapshot,
      player: {
        ...snapshot.player,
        shields: 14,
        modules: [{ id: 1, health: 51, maxHealth: 60 }],
      },
    },
  );
  assert.deepEqual(
    collector.finish().events,
    [
      {
        kind: "damage",
        side: "player",
        shieldDamage: 6,
        hullDamage: 9,
        moduleId: 1,
      },
    ],
    "an ability-driven shield and hull loss becomes a synchronized canvas event",
  );
}

{
  assert.equal(
    typeof appendCombatSnapshotSecondaryDamageEvents,
    "function",
    "secondary damage can be reconciled after the projectile already shown on canvas",
  );
  const secondarySnapshot = {
    player: {
      ...snapshot.player,
      modules: [
        { id: 1, health: 60, maxHealth: 60 },
        { id: 2, health: 40, maxHealth: 40 },
      ],
    },
    enemy: snapshot.enemy,
  };
  const primary = {
    kind: "projectile",
    from: "enemy",
    to: "player",
    weapon: "enemy",
    outcome: "hull",
    shieldDamage: 0,
    hullDamage: 10,
    isCrit: false,
    targetModuleId: 1,
  };
  const collector = createCombatTimelineCollector(secondarySnapshot);

  appendCombatSnapshotSecondaryDamageEvents(
    collector,
    secondarySnapshot,
    {
      ...secondarySnapshot,
      player: {
        ...secondarySnapshot.player,
        modules: [
          { id: 1, health: 50, maxHealth: 60 },
          { id: 2, health: 0, maxHealth: 40 },
        ],
      },
    },
    primary,
  );

  assert.deepEqual(
    collector.finish().events,
    [
      {
        kind: "damage",
        side: "player",
        shieldDamage: 0,
        hullDamage: 40,
        moduleId: 2,
      },
      { kind: "module_destroyed", side: "player", moduleId: 2 },
    ],
    "a secondary explosion animates only the adjacent module loss and never repeats the primary projectile damage",
  );
}

{
  assert.equal(
    typeof getCombatCinematicSnapshotAtProgress,
    "function",
    "playback exposes the current visual snapshot for an in-flight event",
  );

  const impactEvent = {
    kind: "projectile",
    from: "player",
    to: "enemy",
    weapon: "laser",
    outcome: "shield_and_hull",
    shieldDamage: 6,
    hullDamage: 9,
    isCrit: false,
    targetModuleId: 9,
  };
  const beforeImpact = getCombatCinematicSnapshotAtProgress(snapshot, impactEvent, 0.67);
  const shieldImpact = getCombatCinematicSnapshotAtProgress(snapshot, impactEvent, 0.68);
  const hullImpact = getCombatCinematicSnapshotAtProgress(snapshot, impactEvent, 0.76);

  assert.equal(beforeImpact.enemy.shields, 10, "bars remain unchanged before the projectile hits");
  assert.equal(shieldImpact.enemy.shields, 4, "the shield bar changes at the shield contact");
  assert.equal(shieldImpact.enemy.modules[0].health, 40, "hull stays intact until the breach reaches it");
  assert.equal(hullImpact.enemy.modules[0].health, 31, "the hull bar changes at the module contact");

  const absorbed = getCombatCinematicSnapshotAtProgress(snapshot, {
    kind: "projectile",
    from: "enemy",
    to: "player",
    weapon: "enemy",
    outcome: "absorbed",
    shieldDamage: 0,
    hullDamage: 0,
    isCrit: false,
    targetModuleId: 1,
  }, 1);
  assert.deepEqual(
    absorbed,
    snapshot,
    "absorption does not change shields or hull in the visual snapshot",
  );

  const destroyed = getCombatCinematicSnapshotAtProgress(snapshot, {
    kind: "vessel_destroyed",
    side: "enemy",
  }, 0.15);
  assert.equal(
    destroyed.enemy.shields,
    0,
    "destroying a vessel empties its visual shield bar",
  );
  assert.deepEqual(
    destroyed.enemy.modules.map((currentModule) => currentModule.health),
    [0],
    "destroying a core empties the whole visual hull bar even with surviving modules",
  );

  const abilityDamage = getCombatCinematicSnapshotAtProgress(snapshot, {
    kind: "damage",
    side: "player",
    shieldDamage: 6,
    hullDamage: 9,
    moduleId: 1,
  }, 0.62);
  assert.equal(abilityDamage.player.shields, 14, "ability damage updates shields at its visible impact");
  assert.equal(abilityDamage.player.modules[0].health, 51, "ability damage updates hull at its visible impact");
}

{
  const damaged = applyCombatCinematicEvent(snapshot, {
    kind: "projectile",
    from: "player",
    to: "enemy",
    weapon: "laser",
    outcome: "shield_and_hull",
    shieldDamage: 6,
    hullDamage: 9,
    isCrit: true,
    targetModuleId: 9,
  });
  const repaired = applyCombatCinematicEvent(damaged, {
    kind: "heal",
    side: "enemy",
    amount: 4,
    moduleIds: [9],
    source: "regen",
  });

  assert.equal(snapshot.enemy.shields, 10, "playback does not mutate the timeline snapshot");
  assert.equal(damaged.enemy.shields, 4, "impact reduces the visual shield state");
  assert.equal(damaged.enemy.modules[0].health, 31, "impact reduces the visual hull state");
  assert.equal(repaired.enemy.modules[0].health, 35, "repair restores visual hull state");
  assert.equal(
    getCombatCinematicEventDuration({
      kind: "reflection",
      attacker: "enemy",
      defender: "player",
      targetModuleId: 9,
      shieldDamage: 0,
      hullDamage: 12,
    }),
    1700,
    "отражение — три такта: удар, разворот щитом, возврат с попаданием",
  );
  assert.equal(
    getCombatCinematicEventDuration({
      kind: "projectile",
      from: "player",
      to: "enemy",
      weapon: "laser",
      outcome: "hull",
      shieldDamage: 0,
      hullDamage: 12,
      isCrit: false,
    }),
    1208,
    "a plain hull hit is slowed by fifteen percent without changing its place in the volley",
  );
  assert.equal(
    getCombatCinematicEventDuration({
      kind: "projectile",
      from: "player",
      to: "enemy",
      weapon: "laser",
      outcome: "hull",
      shieldDamage: 0,
      hullDamage: 12,
      isCrit: true,
    }),
    1725,
    "a critical hit keeps the longer fifteen-percent beat — it is the moment worth watching",
  );
  assert.ok(
    getCombatCinematicEventDuration({
      kind: "projectile",
      from: "player",
      to: "enemy",
      weapon: "laser",
      outcome: "miss",
      shieldDamage: 0,
      hullDamage: 0,
      isCrit: false,
    }) < getCombatCinematicEventDuration({
      kind: "projectile",
      from: "player",
      to: "enemy",
      weapon: "laser",
      outcome: "hull",
      shieldDamage: 0,
      hullDamage: 12,
      isCrit: false,
    }),
    "промах не занимает столько же времени, сколько попадание",
  );
  assert.ok(
    COMBAT_CINEMATIC_VOLLEY_STAGGER_MS < COMBAT_CINEMATIC_BAY_GAP_MS,
    "внутри палубы очередь плотнее, чем пауза между палубами",
  );
  assert.equal(
    getCombatCinematicStaggerMs(
      { kind: "projectile", from: "player", to: "enemy", weapon: "laser", outcome: "hull", shieldDamage: 0, hullDamage: 5, isCrit: false, volleyId: 7 },
      { kind: "projectile", from: "player", to: "enemy", weapon: "laser", outcome: "hull", shieldDamage: 0, hullDamage: 5, isCrit: false, volleyId: 7 },
    ),
    COMBAT_CINEMATIC_VOLLEY_STAGGER_MS,
    "снаряды одной палубы бьют короткой очередью",
  );
  assert.equal(
    getCombatCinematicStaggerMs(
      { kind: "projectile", from: "player", to: "enemy", weapon: "laser", outcome: "hull", shieldDamage: 0, hullDamage: 5, isCrit: false, volleyId: 7 },
      { kind: "projectile", from: "player", to: "enemy", weapon: "laser", outcome: "hull", shieldDamage: 0, hullDamage: 5, isCrit: false, volleyId: 8 },
    ),
    COMBAT_CINEMATIC_BAY_GAP_MS,
    "перед залпом следующей палубы сцена держит паузу",
  );
  assert.equal(
    getCombatCinematicStaggerMs(
      { kind: "projectile", from: "player", to: "enemy", weapon: "laser", outcome: "hull", shieldDamage: 0, hullDamage: 5, isCrit: false, volleyId: 7 },
      { kind: "projectile", from: "enemy", to: "player", weapon: "enemy", outcome: "hull", shieldDamage: 0, hullDamage: 5, isCrit: false },
    ),
    null,
    "ответ врага не накладывается на залп игрока — это разные ходы",
  );
  assert.equal(
    getCombatCinematicStaggerMs(
      { kind: "projectile", from: "player", to: "enemy", weapon: "laser", outcome: "hull", shieldDamage: 0, hullDamage: 5, isCrit: false, volleyId: 7 },
      { kind: "module_destroyed", side: "enemy", moduleId: 1 },
    ),
    null,
    "уничтожение модуля играет соло, иначе его не прочитать",
  );
  assert.equal(
    getCombatCinematicEventDuration({ kind: "vessel_destroyed", side: "enemy" }),
    720,
    "vessel destruction reserves time for the final explosion and empty bars",
  );
}

function projectileEvents(projectiles, isCrit = false) {
  return buildVolleyEvents({
    from: "player",
    to: "enemy",
    targetModuleId: 9,
    isCrit,
    projectiles,
  });
}

{
  const [event] = buildVolleyEvents({
    from: "player",
    to: "enemy",
    sourceModuleId: 4,
    targetModuleId: 9,
    isCrit: false,
    projectiles: [{ weapon: "laser", outcome: "hull", shieldDamage: 0, hullDamage: 5 }],
  });

  assert.equal(
    event.sourceModuleId,
    4,
    "a player projectile retains the firing weapon-bay module",
  );
}

{
  const events = projectileEvents([
    { weapon: "laser", outcome: "shield", shieldDamage: 20, hullDamage: 0 },
    { weapon: "quantum_torpedo", outcome: "hull", shieldDamage: 0, hullDamage: 55 },
  ]);

  assert.equal(events.length, 2, "two resolved shots create two projectiles");
  assert.deepEqual(
    events.map(({ weapon, outcome, shieldDamage, hullDamage }) => [
      weapon,
      outcome,
      shieldDamage,
      hullDamage,
    ]),
    [
      ["laser", "shield", 20, 0],
      ["quantum_torpedo", "hull", 0, 55],
    ],
    "a shield-only shot never inherits hull damage from a quantum torpedo",
  );
}

{
  const events = buildVolleyEvents({
    from: "player",
    to: "enemy",
    targetModuleId: 9,
    targetHullBeforeVolley: 5,
    isCrit: false,
    projectiles: [
      { weapon: "laser", outcome: "shield", shieldDamage: 12, hullDamage: 0 },
      { weapon: "quantum_torpedo", outcome: "hull", shieldDamage: 0, hullDamage: 8 },
      { weapon: "missile", outcome: "hull", shieldDamage: 0, hullDamage: 8 },
    ],
  });

  assert.deepEqual(
    events.map((event) => event.weapon),
    ["laser", "quantum_torpedo"],
    "a terminal volley keeps the shield break and killing shot, but not weapons fired after the vessel is visibly destroyed",
  );
}

{
  const events = projectileEvents([
    { weapon: "enemy", outcome: "piercing", shieldDamage: 8, hullDamage: 12 },
    { weapon: "enemy", outcome: "blocked", shieldDamage: 0, hullDamage: 0 },
  ]);
  assert.deepEqual(
    events.map(({ outcome, shieldDamage, hullDamage }) => [outcome, shieldDamage, hullDamage]),
    [
      ["piercing", 8, 12],
      ["blocked", 0, 0],
    ],
    "piercing and blocked outcomes preserve their combat meaning instead of becoming a fake hull hit",
  );
}

{
  const events = projectileEvents(
    weaponOrder.map((weapon) => ({
      weapon,
      outcome: weapon === "quantum_torpedo" ? "hull" : "shield",
      shieldDamage: weapon === "quantum_torpedo" ? 0 : 12,
      hullDamage: weapon === "quantum_torpedo" ? 44 : 0,
    })),
  );

  assert.deepEqual(
    events.map((event) => event.weapon),
    weaponOrder,
    "all eight live weapon types receive a visual projectile event",
  );
  assert(events.every((event) => event.shieldDamage + event.hullDamage > 0));
}

{
  const events = projectileEvents([
    { weapon: "missile", outcome: "shield", shieldDamage: 12, hullDamage: 0 },
    { weapon: "missile", outcome: "intercepted", shieldDamage: 0, hullDamage: 0 },
    { weapon: "missile", outcome: "miss", shieldDamage: 0, hullDamage: 0 },
  ]);

  assert.deepEqual(
    events.map((event) => event.outcome),
    ["shield", "intercepted", "miss"],
    "a missile volley distinguishes hit, interception, and ordinary miss",
  );
}

{
  const events = projectileEvents([
    { weapon: "quantum_torpedo", outcome: "hull", shieldDamage: 0, hullDamage: 55 },
  ]);

  assert.deepEqual(
    events.map(({ weapon, outcome, shieldDamage, hullDamage }) => [
      weapon,
      outcome,
      shieldDamage,
      hullDamage,
    ]),
    [["quantum_torpedo", "hull", 0, 55]],
    "a quantum torpedo renders as a direct hull hit",
  );
}

{
  const events = projectileEvents([
    { weapon: "kinetic", outcome: "shield_and_hull", shieldDamage: 2.5, hullDamage: 7.5 },
  ], true);

  assert.deepEqual(
    events.map(({ shieldDamage, hullDamage }) => [shieldDamage, hullDamage]),
    [[2.5, 7.5]],
    "a critical ×1.5 result keeps its exact non-negative damage in the cinematic",
  );
}

{
  const events = projectileEvents([
    { weapon: "plasma", outcome: "miss", shieldDamage: 0, hullDamage: 0 },
    { weapon: "plasma", outcome: "miss", shieldDamage: 0, hullDamage: 0 },
  ]);

  assert.deepEqual(
    events.map((event) => event.outcome),
    ["miss", "miss"],
    "an all-miss volley has no fabricated damage",
  );
}

{
  assert.equal(
    typeof finalizeProjectileHullDamage,
    "function",
    "armor-adjusted hull damage can be reconciled without changing which shot crossed the shield",
  );
  assert.deepEqual(
    finalizeProjectileHullDamage(
      [
        { weapon: "laser", outcome: "shield", shieldDamage: 20, hullDamage: 0 },
        { weapon: "kinetic", outcome: "shield_and_hull", shieldDamage: 5, hullDamage: 10 },
        { weapon: "quantum_torpedo", outcome: "hull", shieldDamage: 0, hullDamage: 50 },
      ],
      30,
    ),
    [
      { weapon: "laser", outcome: "shield", shieldDamage: 20, hullDamage: 0 },
      { weapon: "kinetic", outcome: "shield_and_hull", shieldDamage: 5, hullDamage: 5 },
      { weapon: "quantum_torpedo", outcome: "hull", shieldDamage: 0, hullDamage: 25 },
    ],
    "armor changes only the shots that actually reached the hull and keeps their total equal to live damage",
  );
}

{
  const source = structuredClone(snapshot);
  const collector = createCombatTimelineCollector(source);
  source.enemy.modules[0].health = 0;
  collector.push({ kind: "turn_skipped", side: "player" });
  const timeline = collector.finish();

  assert.equal(
    timeline.initial.enemy.modules[0].health,
    40,
    "a timeline snapshot is detached from later store mutations",
  );
  assert.deepEqual(timeline.events, [{ kind: "turn_skipped", side: "player" }]);
}

{
  const events = [
    {
      kind: "projectile",
      from: "player",
      to: "enemy",
      weapon: "plasma",
      outcome: "hull",
      shieldDamage: 0,
      hullDamage: 30,
      isCrit: true,
      targetModuleId: 9,
    },
    {
      kind: "heal",
      side: "enemy",
      amount: 6,
      moduleIds: [9],
      source: "regen",
    },
    { kind: "module_destroyed", side: "enemy", moduleId: 9 },
    {
      kind: "boss_ability",
      effect: "shield_restore",
      name: "Барьер Предтеч",
    },
  ];
  const knownKinds = new Set([
    "projectile",
    "reflection",
    "heal",
    "shield_restore",
    "damage",
    "module_destroyed",
    "vessel_destroyed",
    "boss_ability",
    "turn_skipped",
  ]);

  assert(events.every((event) => knownKinds.has(event.kind)));
  assert.equal(events[0].isCrit, true, "critical state is retained for the renderer");
  assert.equal(getCombatCinematicEventDuration(events[3]), 720);
}

console.log("Combat cinematic timeline checks passed.");
