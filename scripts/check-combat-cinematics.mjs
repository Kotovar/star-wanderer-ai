import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";

let createCombatTimelineCollector;
let buildVolleyEvents;
let finalizeProjectileHullDamage;
let splitVolleyAtHullDestruction;
let createCombatCinematicSnapshot;
let appendCombatSnapshotDeltaEvents;
let appendCombatSnapshotDamageEvents;
let appendCombatSnapshotSecondaryDamageEvents;
let applyCombatCinematicEvent;
let getCombatCinematicSnapshotAtProgress;
let getCombatCinematicEventDuration;
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
  /const shake = getCameraShake\(event, progress, elapsed\);/,
  "camera shake reacts to every impactful event, not only to a critical hit",
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
assert.match(
  enemyCounterAttackSource,
  /pushEnemyProjectile\(timeline, tgt, 0, 0, false, "absorbed"\)/,
  "phase shield records absorption instead of a zero-damage shield hit",
);
assert.match(
  enemyCounterAttackSource,
  /appendCombatSnapshotSecondaryDamageEvents\(/,
  "secondary module damage from a normal enemy hit stays in the cinematic timeline",
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
        shields: 0,
        maxShields: 0,
        modules: [{ id: 9, health: 40, maxHealth: 40 }],
      },
    },
    "a combat snapshot preserves the visual side and creature model",
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
    900,
    "reflection reserves enough time for the outbound and return flight",
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
    1500,
    "a projectile reserves time for a readable damage number after impact",
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
