import type { PreSpacefaringCivilization } from "@/game/types";

export const PRE_SPACEFARING_SETTLEMENT_ROLL_DIVISOR = 5;
export const PRE_SPACEFARING_SETTLEMENT_TILE_INDICES = [
    7,
    11,
    13,
    17,
] as const;

export const PRE_SPACEFARING_CIVILIZATIONS: readonly PreSpacefaringCivilization[] =
    [
        {
            id: "river_clans",
            civilizationId: "river_clans",
            development: "primitive",
            actions: [
                { id: "observe_starlight", step: 0, reward: { researchResources: [{ type: "alien_biology", quantity: 1 }] } },
                { id: "leave_food", step: 1, requiredGood: { id: "food", quantity: 2 }, reward: { researchResources: [{ type: "alien_biology", quantity: 2 }] } },
                { id: "keep_distance", step: 1, reward: { researchResources: [{ type: "ancient_data", quantity: 1 }] } },
                { id: "protect_clans", step: 2, outcome: "protected", reward: { researchResources: [{ type: "alien_biology", quantity: 2 }] } },
                { id: "support_clans", step: 2, outcome: "assisted", reward: { researchResources: [{ type: "rare_minerals", quantity: 2 }] } },
                { id: "partner_with_clans", step: 2, outcome: "partnered", reward: { researchResources: [{ type: "ancient_data", quantity: 2 }] } },
            ],
        },
        {
            id: "delta_league",
            civilizationId: "delta_league",
            development: "agrarian",
            actions: [
                { id: "survey_fields", step: 0, reward: { researchResources: [{ type: "ancient_data", quantity: 1 }] } },
                { id: "send_medicine", step: 1, requiredGood: { id: "medicine", quantity: 1 }, reward: { researchResources: [{ type: "alien_biology", quantity: 2 }] } },
                { id: "respect_borders", step: 1, reward: { researchResources: [{ type: "ancient_data", quantity: 1 }] } },
                { id: "protect_delta", step: 2, outcome: "protected", reward: { researchResources: [{ type: "alien_biology", quantity: 2 }] } },
                { id: "assist_delta", step: 2, outcome: "assisted", reward: { researchResources: [{ type: "rare_minerals", quantity: 2 }] } },
                { id: "partner_delta", step: 2, outcome: "partnered", reward: { researchResources: [{ type: "tech_salvage", quantity: 2 }] } },
            ],
        },
        {
            id: "forge_cities",
            civilizationId: "forge_cities",
            development: "industrial",
            actions: [
                { id: "review_factories", step: 0, reward: { researchResources: [{ type: "tech_salvage", quantity: 1 }] } },
                { id: "send_spares", step: 1, requiredGood: { id: "spares", quantity: 2 }, reward: { researchResources: [{ type: "tech_salvage", quantity: 2 }] } },
                { id: "limit_exchange", step: 1, reward: { researchResources: [{ type: "ancient_data", quantity: 1 }] } },
                { id: "protect_forges", step: 2, outcome: "protected", reward: { researchResources: [{ type: "alien_biology", quantity: 2 }] } },
                { id: "assist_forges", step: 2, outcome: "assisted", reward: { researchResources: [{ type: "rare_minerals", quantity: 2 }] } },
                { id: "partner_forges", step: 2, outcome: "partnered", reward: { researchResources: [{ type: "tech_salvage", quantity: 2 }] } },
            ],
        },
        {
            id: "coastal_network",
            civilizationId: "coastal_network",
            development: "modern",
            actions: [
                { id: "listen_radio", step: 0, reward: { researchResources: [{ type: "energy_samples", quantity: 1 }] } },
                { id: "radio_exchange", step: 1, requiredGood: { id: "spares", quantity: 1 }, reward: { researchResources: [{ type: "energy_samples", quantity: 2 }] } },
                { id: "radio_silence", step: 1, reward: { researchResources: [{ type: "ancient_data", quantity: 1 }] } },
                { id: "protect_network", step: 2, outcome: "protected", reward: { researchResources: [{ type: "alien_biology", quantity: 2 }] } },
                { id: "assist_network", step: 2, outcome: "assisted", reward: { researchResources: [{ type: "rare_minerals", quantity: 2 }] } },
                { id: "partner_network", step: 2, outcome: "partnered", reward: { researchResources: [{ type: "tech_salvage", quantity: 2 }] } },
            ],
        },
    ];

export const getPreSpacefaringCivilization = (id: string) =>
    PRE_SPACEFARING_CIVILIZATIONS.find((entry) => entry.id === id);
