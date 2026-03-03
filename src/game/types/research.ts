/**
 * Research resource types - rare items needed for research
 */
export type ResearchResourceType =
    | "ancient_data"
    | "rare_minerals"
    | "alien_biology"
    | "energy_samples"
    | "quantum_crystals"
    | "tech_salvage";

/**
 * Research tier - technology level
 */
export type ResearchTier = 1 | 2 | 3 | 4;

/**
 * Research category - technology branch
 */
export type ResearchCategory =
    | "ship_systems"
    | "weapons"
    | "science"
    | "engineering"
    | "biology"
    | "ancient_tech";

/**
 * Research bonus type
 */
export type ResearchBonusType =
    | "module_health"
    | "module_power"
    | "shield_strength"
    | "weapon_damage"
    | "scan_range"
    | "research_speed"
    | "cargo_capacity"
    | "fuel_efficiency"
    | "crew_health"
    | "crew_exp"
    | "new_module"
    | "new_weapon"
    | "special_ability";

/**
 * Research resource in cargo
 */
export interface ResearchResourceItem {
    type: ResearchResourceType;
    quantity: number;
}

/**
 * Research assignment for scientist crew
 */
export type ResearchAssignment =
    | "analyzing"
    | "experimenting"
    | "theorizing"
    | "";

/**
 * Active research project
 */
export interface ActiveResearch {
    techId: string;
    progress: number; // 0-100
    turnsRemaining: number;
    scientistId?: number; // ID of scientist working on this
}

/**
 * Research data stored in game state
 */
export interface ResearchData {
    resources: Partial<Record<ResearchResourceType, number>>; // Player's research resources
    discoveredTechs: string[]; // IDs of discovered technologies
    researchedTechs: string[]; // IDs of completed researches
    activeResearch: ActiveResearch | null; // Currently active research project
}
