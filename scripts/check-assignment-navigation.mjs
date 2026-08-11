import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const uiSlice = readFileSync("src/game/slices/ui/createUiSlice.ts", "utf8");
const assignmentsPanel = readFileSync(
  "src/game/components/AssignmentsPanel.tsx",
  "utf8",
);
const researchPanel = readFileSync("src/game/components/ResearchPanel.tsx", "utf8");
const header = readFileSync("src/game/components/header/Header.tsx", "utf8");

assert.match(uiSlice, /showAssignments:\s*\(\)\s*=>\s*set\(\(state\)/);
assert.match(uiSlice, /closeAssignments:\s*\(\)\s*=>\s*set\(/);
assert.ok(!assignmentsPanel.includes("showGalaxyMap"));
assert.match(researchPanel, /const closeResearchPanel = useGameStore\(\(s\) => s\.closeResearchPanel\)/);
assert.match(researchPanel, /onClick=\{closeResearchPanel\}/);
assert.match(header, /const closeResearchPanel = useGameStore\(\(s\) => s\.closeResearchPanel\)/);
assert.match(header, /gameMode === "research"\) \{\s+closeResearchPanel\(\);/);

console.log("Assignment navigation checks passed");
