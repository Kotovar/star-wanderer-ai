export const ASSIGNMENT_TIRED_AT = 4;
export const ASSIGNMENT_EXHAUSTED_AT = 7;
const ASSIGNMENT_RECOVERY_PER_TURN = 2;
const ASSIGNMENT_REST_TURNS = 2;

export function getAssignmentFatigueState({
  fatigue = 0,
  restTurns = 0,
  assigned,
  canFatigue,
  turn,
}: {
  fatigue?: number;
  restTurns?: number;
  assigned: boolean;
  canFatigue: boolean;
  turn: number;
}): {
  nextFatigue: number;
  nextRestTurns: number;
  shouldWork: boolean;
  startedRest: boolean;
} {
  if (!canFatigue) {
    return {
      nextFatigue: 0,
      nextRestTurns: 0,
      shouldWork: assigned,
      startedRest: false,
    };
  }

  if (restTurns > 0) {
    const nextRestTurns = restTurns - 1;
    return {
      nextFatigue: nextRestTurns === 0 ? 0 : Math.floor(fatigue / 2),
      nextRestTurns,
      shouldWork: false,
      startedRest: false,
    };
  }

  if (!assigned) {
    return {
      nextFatigue: Math.max(0, fatigue - ASSIGNMENT_RECOVERY_PER_TURN),
      nextRestTurns: 0,
      shouldWork: false,
      startedRest: false,
    };
  }

  const nextFatigue = Math.min(ASSIGNMENT_EXHAUSTED_AT, fatigue + 1);
  const startedRest = nextFatigue >= ASSIGNMENT_EXHAUSTED_AT;

  return {
    nextFatigue,
    nextRestTurns: startedRest ? ASSIGNMENT_REST_TURNS : 0,
    shouldWork: fatigue < ASSIGNMENT_TIRED_AT || turn % 2 === 0,
    startedRest,
  };
}
