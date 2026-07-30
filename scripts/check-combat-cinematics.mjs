import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

let createCombatTimelineCollector;
let buildVolleyEvents;
let createCombatCinematicSnapshot;
let appendCombatSnapshotDeltaEvents;
let applyCombatCinematicEvent;
let getCombatCinematicEventDuration;

const modalSource = await readFile(
  new URL("../src/game/components/CombatCinematicModal.tsx", import.meta.url),
  "utf8",
);
const combatPanelSource = await readFile(
  new URL("../src/game/components/CombatPanel.tsx", import.meta.url),
  "utf8",
);
const playerShipGridSource = await readFile(
  new URL("../src/game/components/CombatShipGrid.tsx", import.meta.url),
  "utf8",
);

assert.match(
  modalSource,
  /const stageRef = useRef<HTMLDivElement>\(null\);/,
  "the canvas measures a stable stage instead of its own first animation frame",
);
assert.match(
  modalSource,
  /ref=\{stageRef\}/,
  "the cinematic canvas has a measured stage",
);
assert.match(
  modalSource,
  /stageRef\.current \?\? canvas\.parentElement \?\? canvas/,
  "portal timing falls back to the mounted canvas container instead of leaving it blank",
);
assert.match(
  modalSource,
  /const \[canvas, setCanvas\] = useState<HTMLCanvasElement \| null>\(null\);/,
  "the portal canvas becoming available retriggers cinematic playback",
);
assert.match(
  modalSource,
  /ref=\{setCanvas\}/,
  "the canvas ref is tied to the playback state",
);
assert.match(
  modalSource,
  /sm:!max-w-6xl/,
  "the cinematic dialog overrides the shared small-dialog width on desktop",
);
assert.match(
  combatPanelSource,
  /if \(!fastCombat \|\| !lastEnemyHit\)/,
  "slow combat does not trigger the legacy enemy hit flash",
);
assert.match(
  playerShipGridSource,
  /if \(!fastCombat \|\| !lastPlayerHit\)/,
  "slow combat does not trigger the legacy player hit markers",
);

try {
  ({
    createCombatTimelineCollector,
    buildVolleyEvents,
    createCombatCinematicSnapshot,
    appendCombatSnapshotDeltaEvents,
  } = await import(
    "../src/game/slices/combat/helpers/combatTimeline.ts"
  ));
} catch {
  assert.fail(
    "combatTimeline.ts must provide the deterministic combat cinematic builder",
  );
}

try {
  ({ applyCombatCinematicEvent, getCombatCinematicEventDuration } = await import(
    "../src/game/slices/combat/helpers/combatCinematicPlayback.ts"
  ));
} catch {
  assert.fail("combatCinematicPlayback.ts must provide deterministic canvas playback");
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

const emptyWeaponCounts = () => ({
  kinetic: 0,
  laser: 0,
  missile: 0,
  plasma: 0,
  drones: 0,
  antimatter: 0,
  quantum_torpedo: 0,
  ion_cannon: 0,
});

const emptyMisses = () => emptyWeaponCounts();
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
}

function projectileEvents(input) {
  return buildVolleyEvents({
    from: "player",
    to: "enemy",
    targetModuleId: 9,
    isCrit: false,
    ...input,
  });
}

{
  const weaponCounts = emptyWeaponCounts();
  weaponCounts.laser = 1;
  weaponCounts.kinetic = 1;

  const events = projectileEvents({
    weaponCounts,
    missedShots: emptyMisses(),
    missileInterceptedCount: 0,
    shieldDamage: 10,
    hullDamage: 18,
  });

  assert.equal(events.length, 2, "two fired weapons create two projectiles");
  assert.deepEqual(
    events.map(({ weapon, outcome }) => [weapon, outcome]),
    [
      ["laser", "shield"],
      ["kinetic", "hull"],
    ],
    "the existing weapon order consumes shields before hull",
  );
  assert.equal(
    events.reduce((sum, event) => sum + event.shieldDamage, 0),
    10,
    "visual shield damage equals the resolved total",
  );
  assert.equal(
    events.reduce((sum, event) => sum + event.hullDamage, 0),
    18,
    "visual hull damage equals the resolved total",
  );
}

{
  const weaponCounts = emptyWeaponCounts();
  for (const weapon of weaponOrder) weaponCounts[weapon] = 1;

  const events = projectileEvents({
    weaponCounts,
    missedShots: emptyMisses(),
    missileInterceptedCount: 0,
    shieldDamage: 12,
    hullDamage: 44,
  });

  assert.deepEqual(
    events.map((event) => event.weapon),
    weaponOrder,
    "all eight live weapon types receive a visual projectile event",
  );
  assert(events.every((event) => event.shieldDamage >= 0 && event.hullDamage >= 0));
}

{
  const weaponCounts = emptyWeaponCounts();
  weaponCounts.missile = 3;
  const missedShots = emptyMisses();
  missedShots.missile = 1;

  const events = projectileEvents({
    weaponCounts,
    missedShots,
    missileInterceptedCount: 1,
    shieldDamage: 12,
    hullDamage: 0,
  });

  assert.deepEqual(
    events.map((event) => event.outcome),
    ["shield", "intercepted", "miss"],
    "a missile volley distinguishes hit, interception, and ordinary miss",
  );
}

{
  const weaponCounts = emptyWeaponCounts();
  weaponCounts.quantum_torpedo = 1;

  const events = projectileEvents({
    weaponCounts,
    missedShots: emptyMisses(),
    missileInterceptedCount: 0,
    shieldDamage: 0,
    hullDamage: 55,
  });

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
  const weaponCounts = emptyWeaponCounts();
  weaponCounts.plasma = 2;
  const missedShots = emptyMisses();
  missedShots.plasma = 2;

  const events = projectileEvents({
    weaponCounts,
    missedShots,
    missileInterceptedCount: 0,
    shieldDamage: 0,
    hullDamage: 0,
  });

  assert.deepEqual(
    events.map((event) => event.outcome),
    ["miss", "miss"],
    "an all-miss volley has no fabricated damage",
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
    "module_destroyed",
    "boss_ability",
    "turn_skipped",
  ]);

  assert(events.every((event) => knownKinds.has(event.kind)));
  assert.equal(events[0].isCrit, true, "critical state is retained for the renderer");
  assert.equal(getCombatCinematicEventDuration(events[3]), 720);
}

console.log("Combat cinematic timeline checks passed.");
