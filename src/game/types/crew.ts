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

export type PositiveTraitId =
    | "sharpshooter"
    | "experienced"
    | "charismatic"
    | "resilient"
    | "hardworking"
    | "veteran"
    | "genius"
    | "leader"
    | "lucky"
    | "invincible"
    | "legend"
    | "master";

export type NegativeTraitId =
    | "coward"
    | "slob"
    | "sickly"
    | "greedy"
    | "bad_shot"
    | "pessimist"
    | "fragile"
    | "rebel";

export type MutationTraitId =
    | "tentacles"
    | "third_eye"
    | "chitin"
    | "telepathy"
    | "regeneration"
    | "photosynthesis"
    | "nightmares"
    | "paranoid"
    | "unstable";

export type TraitId = PositiveTraitId | NegativeTraitId | MutationTraitId;

export type CrewMemberAssignment =
    | "targeting"
    | "navigation"
    | "firstaid"
    | "heal"
    | "repair"
    | "morale"
    | "evasion"
    | "overclock"
    | "rapidfire"
    | "calibration"
    | "patrol"
    | "research"
    | "analyzing"
    | "maintenance"
    | "reactor_overload"
    | "analysis"
    | "sabotage"
    | "merge"
    | ""
    | null;

export type CrewMemberCombatAssignment =
    | "targeting"
    | "overclock"
    | "rapidfire"
    | "calibration"
    | "evasion"
    | "repair"
    | "heal"
    | "firstaid"
    | "analysis"
    | "sabotage"
    | "maintenance"
    | ""
    | null;

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
    assignment: CrewMemberAssignment;
    // Civilian assignment
    assignmentEffect: string | null; // Civilian assignment effect
    combatAssignment: CrewMemberCombatAssignment; // Combat assignment
    combatAssignmentEffect: string | null; // Combat assignment effect
    traits: CrewTrait[];
    moduleId: number; // ID of the module where the crew member is located
    movedThisTurn: boolean; // Whether the crew member has moved this turn
    // Xenosymbiont merge state
    isMerged: boolean; // Whether the crew member is merged with a module
    mergedModuleId: number | null; // ID of the module the crew member is merged with
    // First aid protection (reduces damage to crew in same module)
    firstaidActive: boolean;
}

export type CrewTraitEffect = {
    damageBonus?: number;
    defenseBonus?: number;
    desertionRisk?: number;
    critBonus?: number;
    happinessDrain?: number;
    taskPenalty?: number;
    ambushAvoid?: number;
    foodFree?: number;
    needsLight?: number;
    fuelConsumption?: number;
    expBonus?: number;
    regenBonus?: number;
    taskBonus?: number;
    doubleTaskEffect?: number;
    teamMorale?: number;
    moralePenalty?: number;
    moduleMorale?: number;
    combatStartMoraleDrain?: number;
    accuracyPenalty?: number;
    lootBonus?: number;
    combatMoraleDrain?: number;
    sellPricePenalty?: number;
    healthPenalty?: number;
    healthBonus?: number;
    maxHappinessBonus?: number;
};

export interface CrewTrait {
    id?: TraitId;
    name: string;
    desc: string;
    effect: CrewTraitEffect;
    type: CrewTraitType;
}

export type TraitDetails = {
    id: TraitId;
    name: string;
    desc: string;
    effect: CrewTraitEffect;
    rarity: string;
    priceMod: number;
};
