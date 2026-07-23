import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  addEnemyCodexEntry,
  ANCIENT_BOSS_CODEX_ENTRY,
  ENEMY_CODEX_SHIP_ENTRIES,
  getAncientBossCodexId,
  getBossCodexId,
  getEnemyCodexId,
} from "../src/game/constants/enemyCodex.ts";
import { ANCIENT_BOSSES } from "../src/game/constants/bosses.ts";

assert.equal(ENEMY_CODEX_SHIP_ENTRIES.length, 10);
assert.equal(getEnemyCodexId({ enemyType: "pirate" }), "pirate");
assert.equal(
  getEnemyCodexId({
    enemyType: "space_monster",
    spaceMonsterType: "void_ray",
  }),
  "space_monster:void_ray",
);
assert.equal(getEnemyCodexId({ enemyType: "space_monster" }), null);
assert.equal(getAncientBossCodexId(), ANCIENT_BOSS_CODEX_ENTRY.id);
assert.ok(ANCIENT_BOSSES.length > 0);
const firstBoss = ANCIENT_BOSSES[0];
if (!firstBoss) throw new Error("No ancient bosses configured");
assert.equal(getBossCodexId(firstBoss.id), `boss:${firstBoss.id}`);
assert.deepEqual(
  addEnemyCodexEntry(addEnemyCodexEntry([], "pirate"), "pirate"),
  ["pirate"],
);

const panelSource = readFileSync(
  new URL("../src/game/components/EnemyCodexPanel.tsx", import.meta.url),
  "utf8",
);
assert.match(panelSource, /<GameDialogContent\b/);
assert.match(panelSource, /ANCIENT_BOSSES\.map/);
assert.match(panelSource, /getBossCodexId\(boss\.id\)/);

const bossCombatSource = readFileSync(
  new URL("../src/game/slices/combat/helpers/startBossCombat.ts", import.meta.url),
  "utf8",
);
assert.match(bossCombatSource, /getBossCombatModules\(boss\)/);
assert.match(bossCombatSource, /getBossCodexId\(boss\.id\)/);
assert.match(
  panelSource,
  /grid-cols-\[repeat\(auto-fit,minmax\(5\.5rem,1fr\)\)\]/,
);

const combatVisualSource = readFileSync(
  new URL("../src/game/components/CombatShipVisual.tsx", import.meta.url),
  "utf8",
);
assert.match(combatVisualSource, /style=\{\{ width: visualCanvasSize/);

assert.equal(
  new Set(ENEMY_CODEX_SHIP_ENTRIES.map((entry) => entry.id)).size,
  ENEMY_CODEX_SHIP_ENTRIES.length,
);
for (const locale of ["ru", "en"]) {
  const catalog = JSON.parse(
    readFileSync(
      new URL(`../src/lib/locales/${locale}.json`, import.meta.url),
      "utf8",
    ),
  );
  assert.equal(typeof catalog.enemy_codex?.title, "string");
  assert.equal(typeof catalog.enemy_codex?.ancient_boss?.name, "string");
  assert.equal(typeof catalog.enemy_codex?.details, "string");
  assert.equal(typeof catalog.enemy_codex?.combat_profile, "string");
  assert.equal(typeof catalog.enemy_codex?.boss_profile, "string");
  assert.equal(typeof catalog.enemy_codex?.boss_ability, "string");
  assert.equal(typeof catalog.enemy_codex?.combat_stats?.modules, "string");
  for (const entry of ENEMY_CODEX_SHIP_ENTRIES) {
    const translation = catalog.enemy_codex?.ships?.[entry.id];
    assert.equal(typeof translation?.name, "string", `${locale}/${entry.id}: no name`);
    assert.equal(
      typeof translation?.description,
      "string",
      `${locale}/${entry.id}: no description`,
    );
  }
}

console.log("Enemy codex checks passed");
