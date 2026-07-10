export type RandomEventChoiceId = "specialist" | "systems" | "standard";

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
    };
