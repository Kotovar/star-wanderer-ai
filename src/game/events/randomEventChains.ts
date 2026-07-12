import type {
  RandomEventChoiceId,
  RandomEventType,
  ScheduledRandomEventConsequence,
} from "@/game/types/randomEvents";

export const RANDOM_EVENT_CONSEQUENCE_DELAY = 3;

export function scheduleRandomEventConsequence(
  eventType: RandomEventType,
  choice: RandomEventChoiceId,
  currentTurn: number,
): ScheduledRandomEventConsequence {
  return {
    eventType,
    choice,
    triggerTurn: currentTurn + RANDOM_EVENT_CONSEQUENCE_DELAY,
  };
}

export function isRandomEventConsequenceDue(
  consequence: ScheduledRandomEventConsequence,
  currentTurn: number,
): boolean {
  return currentTurn >= consequence.triggerTurn;
}
