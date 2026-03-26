import type { Technology, TechnologyId } from "@/game/types";

// ═══════════════════════════════════════════════════════════════
// TIER 5 - Ancient Technologies (Endgame+) (scienceCost: 1500+)
// ═══════════════════════════════════════════════════════════════

export const TIER5_TECHS: Partial<Record<TechnologyId, Technology>> = {
    ancient_power: {
        id: "ancient_power",
        name: "Сила Древних",
        description:
            "Технологии Древних дают +50% к корпусу, щитам, энергии и урону, -50% к расходу топлива и +3 к дальности сканирования.",
        tier: 5,
        category: "ancient_tech",
        prerequisites: [
            "void_resonance",
            "stellar_genetics",
            "singularity_reactor",
        ],
        resources: {
            quantum_crystals: 12,
            ancient_data: 30,
            energy_samples: 30,
            alien_biology: 20,
        },
        credits: 3000,
        scienceCost: 1500,
        bonuses: [
            {
                type: "module_health",
                value: 0.5,
                description: "+50% к здоровью модулей",
            },
            { type: "module_power", value: 0.5, description: "+50% к энергии" },
            {
                type: "shield_strength",
                value: 0.5,
                description: "+50% к щитам",
            },
            { type: "weapon_damage", value: 0.5, description: "+50% к урону" },
            {
                type: "scan_range",
                value: 3,
                description: "+3 к дальности сканирования",
            },
            {
                type: "fuel_efficiency",
                value: 0.3,
                description: "-30% расход топлива",
            },
        ],
        icon: "👁️",
        color: "#ffd700",
        discovered: false,
        researched: false,
        researchProgress: 0,
    },

    warp_drive: {
        id: "warp_drive",
        name: "Варп-двигатель",
        description:
            "Двигатель Древних позволяет мгновенно прыгать в любой сектор галактики без затрат топлива.",
        tier: 5,
        category: "ancient_tech",
        prerequisites: ["singularity_reactor"],
        resources: {
            quantum_crystals: 15,
            energy_samples: 25,
            ancient_data: 30,
        },
        credits: 3000,
        scienceCost: 1000,
        bonuses: [
            {
                type: "fuel_efficiency",
                value: 1.0,
                description: "Бесплатные перелёты",
            },
            {
                type: "special_ability",
                value: 1,
                description: "Варп-перемещение между секторами",
            },
        ],
        icon: "🚀",
        color: "#ffffff",
        discovered: false,
        researched: false,
        researchProgress: 0,
    },
};
