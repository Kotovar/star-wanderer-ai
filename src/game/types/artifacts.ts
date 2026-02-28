export type ArtifactRarity = "rare" | "legendary" | "mythic" | "cursed";

// Ancient Artifacts - unique items with special effects
export interface Artifact {
    id: string;
    name: string;
    description: string;
    effect: ArtifactEffect;
    discovered: boolean; // Has been found
    researched: boolean; // Has been studied by scientist
    requiresScientistLevel: number; // Level needed to research
    rarity: ArtifactRarity; // cursed = special category
    negativeEffect?: ArtifactNegativeEffect; // For cursed artifacts
    hinted?: boolean; // Has been hinted at by synthetic archives
    cursed?: boolean; // Is this a cursed artifact with negative effects
}

export interface ArtifactEffect {
    type: ArtifactType;
    value?: number; // Effect magnitude
    active?: boolean; // Is effect currently active
}

export interface ArtifactNegativeEffect {
    type: ArtifactNegativeType;
    value?: number; // Effect magnitude
    description: string; // Human-readable description
}

export type ArtifactType =
    // Positive effects
    | "free_power"
    | "damage_reflect"
    | "sector_teleport"
    | "shield_regen"
    | "fuel_free"
    | "crew_immortal"
    | "crit_chance"
    | "artifact_finder"
    | "damage_boost"
    | "module_armor"
    | "nanite_repair"
    | "quantum_scan" // Quantum scanner - requires scanner module
    // Cursed positive effects
    | "abyss_power" // Big power boost but happiness drain
    | "all_seeing" // See all enemies but more ambushes
    | "undying_crew" // Crew can't die but mutates
    | "credit_booster" // More credits but random damage
    | "auto_repair" // Auto repair but crew leaves
    | "critical_overload" // Massive crit but self damage
    | "dark_shield" // Strong shield but morale drain
    | "ai_control" // Ship can operate without crew
    | "void_engine" // Free travel but crew suffering
    | "accuracy_boost"; // бонус к точности

export type ArtifactNegativeType =
    | "happiness_drain" // -X happiness per turn
    | "ambush_chance" // +X% ambush chance
    | "crew_mutation" // Random negative traits
    | "module_damage" // Random module damage
    | "crew_desertion" // Chance crew leaves
    | "self_damage" // Damage to own ship
    | "morale_drain" // -X morale per turn
    | "health_drain"; // -X crew health per turn
