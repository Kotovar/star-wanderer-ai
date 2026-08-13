import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const source = readFileSync(
  resolve(root, "src/game/components/ExpeditionMapCanvas.tsx"),
  "utf8",
);
const atlas = readFileSync(
  resolve(root, "public/assets/expedition_locations.webp"),
);
const vp8x = atlas.indexOf(Buffer.from("VP8X"));

assert.equal(atlas.subarray(0, 4).toString(), "RIFF");
assert.equal(atlas.subarray(8, 12).toString(), "WEBP");
assert.notEqual(vp8x, -1);
assert.equal(1 + atlas.readUIntLE(vp8x + 12, 3), 5600);
assert.equal(1 + atlas.readUIntLE(vp8x + 15, 3), 561);
assert.match(source, /const EXPEDITION_LOCATION_SPRITE_COUNT = 10;/);
assert.match(source, /settlement: 9,/);

console.log("Settlement expedition sprite checks passed.");
