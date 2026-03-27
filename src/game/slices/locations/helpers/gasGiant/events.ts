import type { DiveDepth, DiveEvent } from "@/game/types/exploration";

// Choice design principle:
// Choice 1 — best rewards, highest risk (damage + possible probe loss)
// Choice 2 — decent rewards, moderate risk OR different resource mix
// Choice 3 — smallest rewards, no risk (safe fallback, still worth something)
// All choices give at least 1 resource so no option is ever "pointless"

const DIVE_EVENTS: Record<DiveDepth, DiveEvent[]> = {
    // ─── DEPTH 1: Upper atmosphere — no damage risk, vary resource types ───
    1: [
        {
            titleKey: "gas_giant.event_bioluminescent_swarm_title",
            descKey: "gas_giant.event_bioluminescent_swarm_desc",
            choices: [
                {
                    // Aggressive collection: more biology
                    labelKey: "gas_giant.choice_collect_samples",
                    rewards: [{ type: "alien_biology", quantity: 2 }],
                    damageChance: 20,
                    damageMin: 6,
                    damageMax: 12,
                },
                {
                    // Let swarm pass through probe: mix of types
                    labelKey: "gas_giant.choice_study_bubbles",
                    rewards: [
                        { type: "alien_biology", quantity: 1 },
                        { type: "rare_minerals", quantity: 1 },
                    ],
                },
                {
                    // Just readings: least but still useful
                    labelKey: "gas_giant.choice_take_readings",
                    rewards: [{ type: "alien_biology", quantity: 1 }],
                },
            ],
        },
        {
            titleKey: "gas_giant.event_thermal_pocket_title",
            descKey: "gas_giant.event_thermal_pocket_desc",
            choices: [
                {
                    // Enter the hot stream: most biology, chance to overheat
                    labelKey: "gas_giant.choice_enter_stream",
                    rewards: [{ type: "alien_biology", quantity: 2 }],
                    damageChance: 25,
                    damageMin: 8,
                    damageMax: 14,
                },
                {
                    // Collect from the edge: safer, different mix
                    labelKey: "gas_giant.choice_collect_particles",
                    rewards: [
                        { type: "alien_biology", quantity: 1 },
                        { type: "rare_minerals", quantity: 1 },
                    ],
                },
                {
                    // Navigate around: slowest but safe
                    labelKey: "gas_giant.choice_go_around",
                    rewards: [{ type: "alien_biology", quantity: 1 }],
                },
            ],
        },
        {
            titleKey: "gas_giant.event_gas_currents_title",
            descKey: "gas_giant.event_gas_currents_desc",
            choices: [
                {
                    // Ride the current fast: most biology, slight turbulence
                    labelKey: "gas_giant.choice_use_current",
                    rewards: [{ type: "alien_biology", quantity: 2 }],
                    damageChance: 15,
                    damageMin: 5,
                    damageMax: 10,
                },
                {
                    // Study gas bubbles: biology + minerals
                    labelKey: "gas_giant.choice_study_bubbles",
                    rewards: [
                        { type: "alien_biology", quantity: 1 },
                        { type: "rare_minerals", quantity: 1 },
                    ],
                },
                {
                    // Slow careful approach: just biology, zero risk
                    labelKey: "gas_giant.choice_move_slow",
                    rewards: [{ type: "alien_biology", quantity: 1 }],
                },
            ],
        },
    ],

    // ─── DEPTH 2: Cloud belt — damage risk appears, rewards increase ───
    2: [
        {
            titleKey: "gas_giant.event_creature_swarm_title",
            descKey: "gas_giant.event_creature_swarm_desc",
            choices: [
                {
                    // Study up close: rich biology, real damage chance
                    labelKey: "gas_giant.choice_study_creatures",
                    rewards: [
                        { type: "alien_biology", quantity: 3 },
                        { type: "rare_minerals", quantity: 1 },
                    ],
                    damageChance: 35,
                    damageMin: 15,
                    damageMax: 25,
                },
                {
                    // Scare off first, then collect: less biology, safer
                    labelKey: "gas_giant.choice_scare_off",
                    rewards: [{ type: "alien_biology", quantity: 2 }],
                    damageChance: 15,
                    damageMin: 8,
                    damageMax: 14,
                },
                {
                    // Keep distance: 1 biology, no risk
                    labelKey: "gas_giant.choice_observe",
                    rewards: [{ type: "alien_biology", quantity: 1 }],
                },
            ],
        },
        {
            titleKey: "gas_giant.event_organic_web_title",
            descKey: "gas_giant.event_organic_web_desc",
            choices: [
                {
                    // Probe through the web: good biology + minerals, risk of entanglement
                    labelKey: "gas_giant.choice_investigate",
                    rewards: [
                        { type: "alien_biology", quantity: 2 },
                        { type: "rare_minerals", quantity: 2 },
                    ],
                    damageChance: 30,
                    damageMin: 12,
                    damageMax: 22,
                },
                {
                    // Scan the web structure: biology only, small risk
                    labelKey: "gas_giant.choice_scan_from_distance",
                    rewards: [{ type: "alien_biology", quantity: 2 }],
                    damageChance: 10,
                    damageMin: 6,
                    damageMax: 10,
                },
                {
                    // Circle around: minerals from the exterior, no risk
                    labelKey: "gas_giant.choice_collect_particles",
                    rewards: [{ type: "rare_minerals", quantity: 1 }],
                },
            ],
        },
        {
            titleKey: "gas_giant.event_electrical_storm_title",
            descKey: "gas_giant.event_electrical_storm_desc",
            choices: [
                {
                    // Harvest discharge: good mix, high electrocution risk
                    labelKey: "gas_giant.choice_collect_discharge",
                    rewards: [
                        { type: "alien_biology", quantity: 2 },
                        { type: "rare_minerals", quantity: 2 },
                    ],
                    damageChance: 40,
                    damageMin: 18,
                    damageMax: 30,
                },
                {
                    // Dodge and sample: smaller but safer
                    labelKey: "gas_giant.choice_evade",
                    rewards: [{ type: "alien_biology", quantity: 2 }],
                    damageChance: 15,
                    damageMin: 8,
                    damageMax: 15,
                },
                {
                    // Document from safe distance: 1 biology, no risk
                    labelKey: "gas_giant.choice_document",
                    rewards: [{ type: "alien_biology", quantity: 1 }],
                },
            ],
        },
    ],

    // ─── DEPTH 3: Abyssal zone — serious risks, first void_membrane ───
    3: [
        {
            titleKey: "gas_giant.event_giant_organism_title",
            descKey: "gas_giant.event_giant_organism_desc",
            choices: [
                {
                    // Take biopsy: lots of biology + minerals, probe can be destroyed
                    labelKey: "gas_giant.choice_take_biopsy",
                    rewards: [
                        { type: "alien_biology", quantity: 3 },
                        { type: "rare_minerals", quantity: 2 },
                    ],
                    damageChance: 50,
                    damageMin: 22,
                    damageMax: 38,
                    probeLossChance: 18,
                },
                {
                    // Observe and collect loose tissue: decent biology + first membrane chance
                    labelKey: "gas_giant.choice_observe",
                    rewards: [
                        { type: "alien_biology", quantity: 2 },
                        { type: "void_membrane", quantity: 1 },
                    ],
                    damageChance: 20,
                    damageMin: 10,
                    damageMax: 18,
                },
                {
                    // Careful retreat + take small sample: safe but less
                    labelKey: "gas_giant.choice_retreat_carefully",
                    rewards: [
                        { type: "alien_biology", quantity: 1 },
                        { type: "rare_minerals", quantity: 1 },
                    ],
                },
            ],
        },
        {
            titleKey: "gas_giant.event_pressure_vortex_title",
            descKey: "gas_giant.event_pressure_vortex_desc",
            choices: [
                {
                    // Enter the vortex: rare minerals + void_membrane, serious probe risk
                    labelKey: "gas_giant.choice_enter_vortex",
                    rewards: [
                        { type: "rare_minerals", quantity: 3 },
                        { type: "void_membrane", quantity: 1 },
                    ],
                    damageChance: 55,
                    damageMin: 25,
                    damageMax: 42,
                    probeLossChance: 22,
                },
                {
                    // Collect at the vortex rim: minerals + biology, moderate risk
                    labelKey: "gas_giant.choice_collect_particles",
                    rewards: [
                        { type: "rare_minerals", quantity: 2 },
                        { type: "alien_biology", quantity: 1 },
                    ],
                    damageChance: 20,
                    damageMin: 10,
                    damageMax: 18,
                },
                {
                    // Stabilize and harvest gas bubbles: safe, biology only
                    labelKey: "gas_giant.choice_stabilize",
                    rewards: [{ type: "alien_biology", quantity: 2 }],
                },
            ],
        },
        {
            titleKey: "gas_giant.event_dead_zone_title",
            descKey: "gas_giant.event_dead_zone_desc",
            choices: [
                {
                    // Harvest the membranes directly: void_membrane + biology, real damage risk
                    labelKey: "gas_giant.choice_take_samples",
                    rewards: [
                        { type: "void_membrane", quantity: 1 },
                        { type: "alien_biology", quantity: 2 },
                    ],
                    damageChance: 45,
                    damageMin: 18,
                    damageMax: 32,
                    probeLossChance: 12,
                },
                {
                    // Scan dead zone walls: minerals + biology, low risk
                    labelKey: "gas_giant.choice_scan_from_distance",
                    rewards: [
                        { type: "alien_biology", quantity: 2 },
                        { type: "rare_minerals", quantity: 1 },
                    ],
                    damageChance: 10,
                    damageMin: 6,
                    damageMax: 10,
                },
                {
                    // Bypass but take edge samples: safe 2 biology
                    labelKey: "gas_giant.choice_bypass_zone",
                    rewards: [{ type: "alien_biology", quantity: 2 }],
                },
            ],
        },
    ],

    // ─── DEPTH 4: Metallic core — extreme risk, void_membrane main source ───
    4: [
        {
            titleKey: "gas_giant.event_storm_heart_title",
            descKey: "gas_giant.event_storm_heart_desc",
            choices: [
                {
                    // Plunge into the core: 2 membranes, very high probe loss
                    labelKey: "gas_giant.choice_enter_core",
                    rewards: [
                        { type: "void_membrane", quantity: 2 },
                        { type: "alien_biology", quantity: 2 },
                    ],
                    damageChance: 70,
                    damageMin: 30,
                    damageMax: 50,
                    probeLossChance: 40,
                },
                {
                    // Sample at the core boundary: 1 membrane + biology, moderate probe risk
                    labelKey: "gas_giant.choice_collect_at_edge",
                    rewards: [
                        { type: "void_membrane", quantity: 1 },
                        { type: "alien_biology", quantity: 2 },
                    ],
                    damageChance: 35,
                    damageMin: 18,
                    damageMax: 30,
                    probeLossChance: 15,
                },
                {
                    // Extract probe safely: safe biology + minerals (no membrane)
                    labelKey: "gas_giant.choice_extract_probe",
                    rewards: [
                        { type: "alien_biology", quantity: 2 },
                        { type: "rare_minerals", quantity: 1 },
                    ],
                },
            ],
        },
        {
            titleKey: "gas_giant.event_primordial_matter_title",
            descKey: "gas_giant.event_primordial_matter_desc",
            choices: [
                {
                    // Capture primordial sample: 2 membranes + minerals, high probe loss
                    labelKey: "gas_giant.choice_capture_sample",
                    rewards: [
                        { type: "void_membrane", quantity: 2 },
                        { type: "rare_minerals", quantity: 2 },
                    ],
                    damageChance: 65,
                    damageMin: 28,
                    damageMax: 45,
                    probeLossChance: 35,
                },
                {
                    // Scan from distance: 1 membrane + biology, low probe risk
                    labelKey: "gas_giant.choice_scan_from_distance",
                    rewards: [
                        { type: "void_membrane", quantity: 1 },
                        { type: "alien_biology", quantity: 2 },
                    ],
                    damageChance: 25,
                    damageMin: 12,
                    damageMax: 20,
                },
                {
                    // Observe only: safe biology + minerals (no membrane)
                    labelKey: "gas_giant.choice_observation_only",
                    rewards: [
                        { type: "alien_biology", quantity: 2 },
                        { type: "rare_minerals", quantity: 1 },
                    ],
                },
            ],
        },
        {
            titleKey: "gas_giant.event_living_lightning_title",
            descKey: "gas_giant.event_living_lightning_desc",
            choices: [
                {
                    // Catch the living discharge: 2 membranes, extreme probe loss
                    labelKey: "gas_giant.choice_catch_discharge",
                    rewards: [
                        { type: "void_membrane", quantity: 2 },
                        { type: "alien_biology", quantity: 1 },
                    ],
                    damageChance: 75,
                    damageMin: 35,
                    damageMax: 55,
                    probeLossChance: 45,
                },
                {
                    // Dodge and collect residue: 1 membrane + minerals, moderate risk
                    labelKey: "gas_giant.choice_evade",
                    rewards: [
                        { type: "void_membrane", quantity: 1 },
                        { type: "alien_biology", quantity: 1 },
                    ],
                    damageChance: 30,
                    damageMin: 14,
                    damageMax: 22,
                    probeLossChance: 10,
                },
                {
                    // Analyse from afar: safe biology + minerals (no membrane)
                    labelKey: "gas_giant.choice_analysis_from_distance",
                    rewards: [
                        { type: "alien_biology", quantity: 2 },
                        { type: "rare_minerals", quantity: 1 },
                    ],
                },
            ],
        },
    ],
};

export function pickDiveEvent(depth: DiveDepth): DiveEvent {
    const pool = DIVE_EVENTS[depth];
    return pool[Math.floor(Math.random() * pool.length)];
}
