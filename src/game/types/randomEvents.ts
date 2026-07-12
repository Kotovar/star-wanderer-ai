export type RandomEventChoiceId = "specialist" | "systems" | "standard";

export type RandomEventType =
  | "storm"
  | "capsule"
  | "virus"
  | "fuel_leak"
  | "crew_dispute"
  | "biohazard";

export interface ScheduledRandomEventConsequence {
  eventType: RandomEventType;
  choice: RandomEventChoiceId;
  triggerTurn: number;
}

export type PendingRandomEvent =
  | {
      type: "storm";
      damage: number;
      targetModuleId: number;
    }
  | {
      type: "capsule";
      reward: number;
    }
  | {
      type: "virus";
      happinessPenalty: number;
    }
  | {
      type: "fuel_leak";
      fuelLoss: number;
    }
  | {
      type: "crew_dispute";
      happinessPenalty: number;
    }
  | {
      type: "biohazard";
      crewDamage: number;
    }
  | {
      type: "consequence";
      eventType: RandomEventType;
      choice: RandomEventChoiceId;
    };
