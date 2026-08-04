import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(
  new URL("../src/game/slices/combat/helpers/combatTime.ts", import.meta.url),
  "utf8",
);
const start = source.indexOf("export function advanceCombatRound");
const end = source.indexOf("\n}\n\nexport function applyCombatTimeCost", start);
assert.ok(start >= 0 && end > start, "combat round seam must remain identifiable");

const combatRound = source.slice(start, end);
const moduleDamageIndex = combatRound.indexOf("checkModuleDamage(get, set as unknown as SetState)");
const assignmentsIndex = combatRound.indexOf("processCrewAssignments(set as unknown as SetState, get)");
const movementResetIndex = combatRound.indexOf("crewMember.movedThisTurn = false");

assert.ok(moduleDamageIndex >= 0, "combat round must apply critical-module damage");
assert.ok(assignmentsIndex > moduleDamageIndex, "crew processing must follow module damage");
assert.ok(movementResetIndex > assignmentsIndex, "crew movement must reset after crew processing");
assert.doesNotMatch(combatRound, /s\.turn\s*(?:\+=|=)/, "combat round must not change strategic turn");
