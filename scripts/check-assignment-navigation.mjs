import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const uiSlice = readFileSync("src/game/slices/ui/createUiSlice.ts", "utf8");
const assignmentsPanel = readFileSync(
  "src/game/components/AssignmentsPanel.tsx",
  "utf8",
);

assert.match(uiSlice, /showAssignments:\s*\(\)\s*=>\s*set\(\(state\)/);
assert.match(uiSlice, /closeAssignments:\s*\(\)\s*=>\s*set\(/);
assert.ok(!assignmentsPanel.includes("showGalaxyMap"));

console.log("Assignment navigation checks passed");
