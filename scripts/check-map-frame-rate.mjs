import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const frameRateModule = await import(
  new URL("../src/game/components/mapFrameRate.ts", import.meta.url),
).catch(() => null);

assert.ok(frameRateModule, "main map frame-rate limiter exists");

const { MAIN_MAP_FRAME_INTERVAL_MS, shouldRedrawMainMap } = frameRateModule;

assert.equal(MAIN_MAP_FRAME_INTERVAL_MS, 1000 / 30, "main map redraws are capped at 30 FPS");
assert.equal(shouldRedrawMainMap(1_000, 1_033), false, "skip a redraw before 30 FPS interval");
assert.equal(shouldRedrawMainMap(1_000, 1_034), true, "redraw after 30 FPS interval");

const mapSources = await Promise.all(
  ["GalaxyMap.tsx", "SectorMap.tsx"].map((fileName) =>
    readFile(new URL(`../src/game/components/${fileName}`, import.meta.url), "utf8"),
  ),
);

mapSources.forEach((source) => {
  assert.match(source, /shouldRedrawMainMap\(lastMainCanvasDrawAtRef\.current, timestamp\)/);
});

console.log("map frame-rate checks passed");
