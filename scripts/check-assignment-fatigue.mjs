import assert from "node:assert/strict";
import {
  ASSIGNMENT_EXHAUSTED_AT,
  getAssignmentFatigueState,
} from "../src/game/crew/assignmentFatigue.ts";

assert.deepEqual(
  getAssignmentFatigueState({ fatigue: 0, assigned: true, canFatigue: true, turn: 1 }),
  { nextFatigue: 1, nextRestTurns: 0, shouldWork: true, startedRest: false },
);
assert.equal(
  getAssignmentFatigueState({ fatigue: 4, assigned: true, canFatigue: true, turn: 1 }).shouldWork,
  false,
);
assert.deepEqual(
  getAssignmentFatigueState({
    fatigue: ASSIGNMENT_EXHAUSTED_AT - 1,
    assigned: true,
    canFatigue: true,
    turn: 8,
  }),
  {
    nextFatigue: ASSIGNMENT_EXHAUSTED_AT,
    nextRestTurns: 2,
    shouldWork: true,
    startedRest: true,
  },
);
assert.deepEqual(
  getAssignmentFatigueState({
    fatigue: ASSIGNMENT_EXHAUSTED_AT,
    restTurns: 1,
    assigned: true,
    canFatigue: true,
    turn: 9,
  }),
  { nextFatigue: 0, nextRestTurns: 0, shouldWork: false, startedRest: false },
);
assert.equal(
  getAssignmentFatigueState({ fatigue: 6, assigned: false, canFatigue: true, turn: 8 })
    .nextFatigue,
  4,
);
assert.deepEqual(
  getAssignmentFatigueState({ fatigue: 6, assigned: true, canFatigue: false, turn: 9 }),
  { nextFatigue: 0, nextRestTurns: 0, shouldWork: true, startedRest: false },
);

console.log("Assignment fatigue checks passed");
