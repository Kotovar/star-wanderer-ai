import type { RuinsEvent } from "@/game/types/exploration";

export const RUINS_EVENTS: RuinsEvent[] = [
    {
        titleKey: "ruins_ancient_archive",
        descKey: "ruins_ancient_archive_desc",
        choices: [
            {
                labelKey: "ruins_choice_download_data",
                rewardType: "research_resource",
                rewardResourceType: "ancient_data",
                rewardValue: 2,
            },
            {
                labelKey: "ruins_choice_search_terminals",
                rewardType: "credits",
                rewardValue: 200,
                riskType: "crew_damage",
                riskValue: 10,
            },
            {
                labelKey: "ruins_choice_leave",
                rewardType: "nothing",
            },
        ],
    },
    {
        titleKey: "ruins_supply_cache",
        descKey: "ruins_supply_cache_desc",
        choices: [
            {
                labelKey: "ruins_choice_open_cache",
                rewardType: "trade_good",
                rewardGoodId: "medicine",
                rewardValue: 2,
            },
            {
                labelKey: "ruins_choice_scan_cache",
                rewardType: "research_resource",
                rewardResourceType: "tech_salvage",
                rewardValue: 2,
            },
            {
                labelKey: "ruins_choice_leave",
                rewardType: "nothing",
            },
        ],
    },
    {
        titleKey: "ruins_collapsed_lab",
        descKey: "ruins_collapsed_lab_desc",
        choices: [
            {
                labelKey: "ruins_choice_dig_through",
                rewardType: "research_resource",
                rewardResourceType: "tech_salvage",
                rewardValue: 3,
                riskType: "crew_damage",
                riskValue: 12,
            },
            {
                labelKey: "ruins_choice_collect_samples",
                rewardType: "research_resource",
                rewardResourceType: "alien_biology",
                rewardValue: 2,
            },
            {
                labelKey: "ruins_choice_leave",
                rewardType: "nothing",
            },
        ],
    },
    {
        titleKey: "ruins_memorial_site",
        descKey: "ruins_memorial_site_desc",
        choices: [
            {
                labelKey: "ruins_choice_study_inscription",
                rewardType: "research_resource",
                rewardResourceType: "ancient_data",
                rewardValue: 3,
            },
            {
                labelKey: "ruins_choice_look_for_valuables",
                rewardType: "credits",
                rewardValue: 300,
                riskType: "crew_damage",
                riskValue: 8,
            },
            {
                labelKey: "ruins_choice_leave",
                rewardType: "nothing",
            },
        ],
    },
    {
        titleKey: "ruins_energy_node",
        descKey: "ruins_energy_node_desc",
        choices: [
            {
                labelKey: "ruins_choice_extract_energy",
                rewardType: "research_resource",
                rewardResourceType: "energy_samples",
                rewardValue: 3,
                riskType: "crew_damage",
                riskValue: 15,
            },
            {
                labelKey: "ruins_choice_safe_scan",
                rewardType: "research_resource",
                rewardResourceType: "energy_samples",
                rewardValue: 1,
            },
            {
                labelKey: "ruins_choice_leave",
                rewardType: "nothing",
            },
        ],
    },
    {
        titleKey: "ruins_crystal_formation",
        descKey: "ruins_crystal_formation_desc",
        choices: [
            {
                labelKey: "ruins_choice_harvest_crystals",
                rewardType: "research_resource",
                rewardResourceType: "quantum_crystals",
                rewardValue: 2,
                riskType: "crew_damage",
                riskValue: 10,
            },
            {
                labelKey: "ruins_choice_study_formation",
                rewardType: "research_resource",
                rewardResourceType: "rare_minerals",
                rewardValue: 3,
            },
            {
                labelKey: "ruins_choice_leave",
                rewardType: "nothing",
            },
        ],
    },
    {
        titleKey: "ruins_old_bunker",
        descKey: "ruins_old_bunker_desc",
        choices: [
            {
                labelKey: "ruins_choice_explore_bunker",
                rewardType: "artifact",
                riskType: "crew_damage",
                riskValue: 12,
            },
            {
                labelKey: "ruins_choice_salvage_parts",
                rewardType: "trade_good",
                rewardGoodId: "spares",
                rewardValue: 3,
            },
            {
                labelKey: "ruins_choice_leave",
                rewardType: "nothing",
            },
        ],
    },
    {
        titleKey: "ruins_toxic_spill",
        descKey: "ruins_toxic_spill_desc",
        choices: [
            {
                labelKey: "ruins_choice_collect_samples",
                rewardType: "research_resource",
                rewardResourceType: "alien_biology",
                rewardValue: 3,
                riskType: "crew_damage",
                riskValue: 15,
            },
            {
                labelKey: "ruins_choice_neutralize_safely",
                rewardType: "credits",
                rewardValue: 150,
            },
            {
                labelKey: "ruins_choice_leave",
                rewardType: "nothing",
            },
        ],
    },
];

export function pickRuinsEvent(): RuinsEvent {
    return RUINS_EVENTS[Math.floor(Math.random() * RUINS_EVENTS.length)];
}
