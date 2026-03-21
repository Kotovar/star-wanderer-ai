import type { CraftingRecipeId } from "./crafting";

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
 * Technology ID - unique identifier for each technology in the research tree
 */
export type TechnologyId =
    | "reinforced_hull"
    | "efficient_reactor"
    | "targeting_matrix"
    | "scanner_mk2"
    | "automated_repair"
    | "medbay_upgrade"
    | "shield_booster"
    | "ion_drive"
    | "plasma_weapons"
    | "combat_drones"
    | "quantum_scanner"
    | "lab_network"
    | "cargo_expansion"
    | "crew_training"
    | "nanite_hull"
    | "phase_shield"
    | "singularity_reactor"
    | "antimatter_weapons"
    | "quantum_torpedo"
    | "deep_scan"
    | "genetic_enhancement"
    | "neural_interface"
    | "void_resonance"
    | "ancient_power"
    | "stellar_genetics"
    | "warp_drive"
    | "artifact_study"
    | "relic_chamber"
    | "ancient_resonance"
    | "artifact_mastery"
    | "xenobiology"
    | "planetary_drill"
    | "atmospheric_analysis"
    | "storm_shields"
    | "modular_arsenal"
    | "ion_cannon";

/**
 * Research tier - technology level
 */
export type ResearchTier = 1 | 2 | 3 | 4 | 5;

export type ResearchRarity = "common" | "uncommon" | "rare" | "legendary";

export interface ResearchResource {
    id: ResearchResourceType;
    name: string;
    description: string;
    icon: string;
    color: string;
    rarity: ResearchRarity;
}

/**
 * Research category - technology branch
 */
export type ResearchCategory =
    | "ship_systems"
    | "weapons"
    | "science"
    | "engineering"
    | "biology"
    | "ancient_tech"
    | "artifacts";

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
    | "special_ability"
    | "nanite_repair"
    | "artifact_slots"
    | "artifact_effect_boost"
    | "weapon_slots";

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
    techId: TechnologyId;
    progress: number; // 0-100
    turnsRemaining: number;
    scientistId?: number; // ID of scientist working on this
}

/**
 * Research data stored in game state
 */
export interface ResearchData {
    resources: Partial<Record<ResearchResourceType, number>>; // Player's research resources
    discoveredTechs: TechnologyId[]; // IDs of discovered technologies
    researchedTechs: TechnologyId[]; // IDs of completed researches
    activeResearch: ActiveResearch | null; // Currently active research project
    unlockedRecipes: CraftingRecipeId[]; // IDs of crafting recipes unlocked by research
}

export interface ResearchBonus {
    type: ResearchBonusType;
    value: number;
    description: string;
}

/**
 * Технологии в дереве технологий
 */
export interface Technology {
    id: TechnologyId;
    name: string;
    description: string;
    tier: ResearchTier;
    category: ResearchCategory;

    // Requirements
    prerequisites: TechnologyId[]; // IDs of technologies that must be researched first
    resources: Partial<Record<ResearchResourceType, number>>; // Required resources
    credits: number; // Credit cost
    scienceCost: number; // Science points needed to complete research

    // Rewards
    bonuses: ResearchBonus[];

    // Meta
    icon: string;
    color: string;
    discovered: boolean; // Whether player knows about this tech
    researched: boolean; // Whether player has researched this tech
    researchProgress: number; // 0-100, current progress
}
