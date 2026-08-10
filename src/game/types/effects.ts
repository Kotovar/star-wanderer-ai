import type { RaceId } from "./races";

/**
 * Типы эффектов артефактов
 */
export type ArtifactEffectType =
    | "health_regen"
    | "combat_bonus"
    | "evasion_bonus"
    | "power_boost"
    | "shield_boost"
    | "fuel_efficiency"
    | "artifact_boost";

/**
 * Типы эффектов планет (рас)
 */
export type PlanetEffectType =
    | "health_boost"
    | "health_regen"
    | "crew_level"
    | "sector_scan"
    | "artifact_hints"
    | "combat_bonus"
    | "evasion_bonus"
    | "power_boost"
    | "shield_boost"
    | "fuel_efficiency"
    | "artifact_boost";

/**
 * Типы эффектов станций (разовые покупки на станции, напр. буст исследований)
 */
export type StationEffectType = "research_speed";

/**
 * Объединённый тип для всех эффектов в игре
 */
export type EffectType = ArtifactEffectType | PlanetEffectType | StationEffectType;

export type EffectSource = "planet" | "crew" | "combat" | "anomaly" | "event" | "station" | "sector";
export type EffectPolarity = "positive" | "negative" | "mixed";

export interface ActiveEffect {
    id: string;
    definitionId?: string;
    name: string;
    description: string;
    nameKey?: string;
    descriptionKey?: string;
    raceId?: RaceId;
    source?: EffectSource;
    polarity?: EffectPolarity;
    icon?: string;
    color?: string;
    acquiredTurn?: number;
    totalTurns?: number;
    turnsRemaining: number;
    permanent?: boolean;
    effects: {
        type: EffectType;
        value: number | string;
    }[];
    targetArtifactId?: string; // For artifact_boost effect - which artifact is enhanced
    /**
     * Сколько щита эффект реально снял/добавил после упора в 0.
     * Без этого снятие эффекта вернуло бы больше, чем он забрал.
     */
    appliedShieldDelta?: number;
}
