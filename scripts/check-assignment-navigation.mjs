import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import "./register-ts-loader.mjs";

const { createUiSlice } = await import("../src/game/slices/ui/createUiSlice.ts");

const assignmentsPanel = readFileSync(
  "src/game/components/AssignmentsPanel.tsx",
  "utf8",
);
const researchPanel = readFileSync("src/game/components/ResearchPanel.tsx", "utf8");
const header = readFileSync("src/game/components/header/Header.tsx", "utf8");

for (const gameMode of ["planet", "station", "galaxy_map", "gas_giant"]) {
  const state = { gameMode, previousGameMode: null };
  const ui = createUiSlice((update) => Object.assign(state, typeof update === "function" ? update(state) : update));
  ui.showAssignments();
  assert.equal(state.gameMode, "assignments");
  assert.equal(state.previousGameMode, gameMode);
  ui.closeAssignments();
  assert.equal(state.gameMode, gameMode);
  assert.equal(state.previousGameMode, null);
}
assert.ok(!assignmentsPanel.includes("showGalaxyMap"));
assert.match(researchPanel, /const closeResearchPanel = useGameStore\(\(s\) => s\.closeResearchPanel\)/);
assert.match(researchPanel, /onClick=\{closeResearchPanel\}/);
assert.match(header, /const closeResearchPanel = useGameStore\(\(s\) => s\.closeResearchPanel\)/);
assert.match(header, /gameMode === "research"\) \{\s+closeResearchPanel\(\);/);

console.log("Assignment navigation checks passed");
