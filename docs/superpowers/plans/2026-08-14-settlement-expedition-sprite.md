# Settlement Expedition Sprite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render the settlement expedition cell from the shared location atlas using a neutral pre-spacefaring settlement sprite.

**Architecture:** Keep the existing horizontal WebP atlas and its canvas rendering path. Append one 560 x 561 frame, map `settlement` to index 9, and retain `drawSettlementIcon` only as the image-load fallback. A small Node assertion script prevents atlas-size and source-map drift.

**Tech Stack:** Next.js 16, React 19, TypeScript, HTML canvas, Node.js built-ins, WebP asset.

## Global Constraints

- Use the existing `public/assets/expedition_locations.webp` atlas; do not add a rendering dependency.
- The new frame is 560 x 561 with transparency and is the tenth horizontal frame.
- Show compact stone-and-wood homes, a path, and warm firelight; do not reveal a civilization's technological level.
- Do not change gameplay, contact, base, localization, or saved data behavior.
- Retain the canvas-only settlement icon as a fallback when the atlas cannot load.

---

### Task 1: Add an atlas and mapping regression check

**Files:**
- Create: `scripts/check-settlement-expedition-sprite.mjs`
- Read: `src/game/components/ExpeditionMapCanvas.tsx:81-95`
- Read: `public/assets/expedition_locations.webp`

**Interfaces:**
- Consumes: the WebP RIFF/VP8X header and the literal `TILE_SPRITE_INDEX` source mapping.
- Produces: a zero-exit Node command when the atlas is 5600 x 561 and `settlement` maps to frame 9 of 10.

- [ ] **Step 1: Write the failing regression check**

```js
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const source = readFileSync(
  resolve(root, "src/game/components/ExpeditionMapCanvas.tsx"),
  "utf8",
);
const atlas = readFileSync(resolve(root, "public/assets/expedition_locations.webp"));
const vp8x = atlas.indexOf(Buffer.from("VP8X"));

assert.equal(atlas.subarray(0, 4).toString(), "RIFF");
assert.equal(atlas.subarray(8, 12).toString(), "WEBP");
assert.notEqual(vp8x, -1);
assert.equal(1 + atlas.readUIntLE(vp8x + 12, 3), 5600);
assert.equal(1 + atlas.readUIntLE(vp8x + 15, 3), 561);
assert.match(source, /const EXPEDITION_LOCATION_SPRITE_COUNT = 10;/);
assert.match(source, /settlement: 9,/);
```

- [ ] **Step 2: Run the check to verify RED**

Run: `node scripts/check-settlement-expedition-sprite.mjs`

Expected: an assertion failure because the current atlas is 5040 x 561 and the source contains only 9 frames.

- [ ] **Step 3: Commit the executable check**

```bash
git add scripts/check-settlement-expedition-sprite.mjs
git commit -m "test: cover settlement expedition sprite atlas"
```

### Task 2: Generate and map the settlement atlas frame

**Files:**
- Modify: `public/assets/expedition_locations.webp`
- Modify: `src/game/components/ExpeditionMapCanvas.tsx:81-95`
- Test: `scripts/check-settlement-expedition-sprite.mjs`

**Interfaces:**
- Consumes: `ExploreTileType` value `settlement`, the shared horizontal atlas, and `drawTileSprite`'s `TILE_SPRITE_INDEX` lookup.
- Produces: `TILE_SPRITE_INDEX.settlement === 9` with `EXPEDITION_LOCATION_SPRITE_COUNT === 10`, so `drawTileSprite` crops the new final frame.

- [ ] **Step 1: Generate the single source frame**

Use the current atlas as visual reference and generate one square transparent-background sprite candidate with this content:

```
Pixel-art expedition-map sprite matching the supplied sci-fi location atlas: a neutral pre-spacefaring settlement, three or four compact stone-and-wood homes, a winding path and a small amber campfire. Dark charcoal outline, believable weathered materials, subtle cyan accent lights only as artistic color, centered composition, no people, no text, no antennae, no radios, no spacecraft, no orbital imagery, no modern city skyline, no technology-level marker. Isolated on a flat magenta chroma-key background.
```

- [ ] **Step 2: Build the final atlas**

Remove the chroma-key background, resize/crop the generated candidate to a centered 560 x 561 transparent frame, append it after the ninth existing frame, and preserve all existing frames unchanged. The resulting asset must be 5600 x 561 with alpha.

- [ ] **Step 3: Make the smallest source change**

In `src/game/components/ExpeditionMapCanvas.tsx`, change the map constants exactly to:

```ts
const EXPEDITION_LOCATION_SPRITE_COUNT = 10;

const TILE_SPRITE_INDEX: Partial<Record<ExploreTileType, number>> = {
  // Existing mappings stay unchanged.
  signal: 8,
  settlement: 9,
};
```

Do not remove `drawSettlementIcon`; `drawTile` must still call it whenever the image is unavailable.

- [ ] **Step 4: Run the regression check to verify GREEN**

Run: `node scripts/check-settlement-expedition-sprite.mjs`

Expected: exit code 0 after confirming the WebP header dimensions and the two source mappings.

- [ ] **Step 5: Run project verification**

Run: `npm run type-check`, `npm run lint`, and `git diff --check`.

Expected: all commands exit 0.

- [ ] **Step 6: Commit the asset and mapping**

```bash
git add public/assets/expedition_locations.webp src/game/components/ExpeditionMapCanvas.tsx
git commit -m "feat: add settlement expedition sprite"
```
