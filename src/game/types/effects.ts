import type { RaceId } from "./races";

export type ArtefatType =
    | "health_regen"
    | "combat_bonus"
    | "evasion_bonus"
    | "power_boost"
    | "shield_boost"
    | "fuel_efficiency"
    | "artifact_boost";

export interface ActiveEffect {
    id: string;
    name: string;
    description: string;
    raceId: RaceId;
    turnsRemaining: number;
    effects: {
        type: ArtefatType;
        value: number | string;
    }[];
    targetArtifactId?: string; // For artifact_boost effect - which artifact is enhanced
}
