import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const read = (relativePath) => readFile(new URL(relativePath, root), "utf8");
const [types, start, reveal, panel, ruSource, enSource] = await Promise.all([
  read("src/game/types/exploration.ts"),
  read("src/game/slices/locations/helpers/expedition/startExpedition.ts"),
  read("src/game/slices/locations/helpers/expedition/revealExpeditionTile.ts"),
  read("src/game/components/PlanetExplorationPanel.tsx"),
  read("src/lib/locales/ru.json"),
  read("src/lib/locales/en.json"),
]);
const ru = JSON.parse(ruSource);
const en = JSON.parse(enSource);

assert.match(types, /emptyArtifactTileIndex\?: number \| null;/);
assert.match(start, /emptyArtifactTileIndex: null,/);
assert.match(reveal, /emptyArtifactTileIndex: null,/);
assert.match(reveal, /emptyArtifactTileIndex: tileIndex,/);
assert.match(
  panel,
  /const emptyArtifactTileIndex = expedition\.emptyArtifactTileIndex \?\? null;/,
);
assert.match(
  panel,
  /t\("planet_panel\.expedition_artifact_empty", \{ tile: emptyArtifactTileIndex \+ 1 \}\)/,
);
assert.match(panel, /aria-live="polite"/);
assert.equal(typeof ru.planet_panel.expedition_artifact_empty, "string");
assert.equal(typeof en.planet_panel.expedition_artifact_empty, "string");

console.log("Expedition feedback checks passed.");
