import type { RaceId } from "./races";

export type CrewTraitType = "positive" | "negative" | "neutral" | "mutation";

export type Profession =
    | "pilot"
    | "engineer"
    | "medic"
    | "scout"
    | "scientist"
    | "gunner";

export type Quality = "poor" | "average" | "good" | "excellent";

export type MutationName = "nightmares" | "paranoid" | "unstable";

export interface CrewMember {
    id: number;
    name: string;
    race: RaceId; // Race of the crew member
    profession: Profession;
    level: number;
    exp: number;
    health: number;
    maxHealth: number; // Maximum health (modified by race bonuses)
    happiness: number;
    maxHappiness: number; // Maximum happiness (modified by traits, e.g., Legend +50)
    turnsAtZeroHappiness: number; // Turns spent at 0 happiness (for desertion)
    assignment: string | null; // Civilian assignment
    assignmentEffect: string | null; // Civilian assignment effect
    combatAssignment: string | null; // Combat assignment
    combatAssignmentEffect: string | null; // Combat assignment effect
    traits: CrewTrait[];
    moduleId: number; // ID of the module where the crew member is located
    movedThisTurn: boolean; // Whether the crew member has moved this turn
}

export interface CrewTrait {
    name: string;
    desc: string;
    effect: Partial<Record<string, number>>;
    type: CrewTraitType;
}
