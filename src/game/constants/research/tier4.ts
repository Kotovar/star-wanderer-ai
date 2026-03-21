import type { Technology, TechnologyId } from "@/game/types";

// ═══════════════════════════════════════════════════════════════
// TIER 4 - Ancient Technologies (Endgame) (scienceCost: 800-1000)
// ═══════════════════════════════════════════════════════════════

export const TIER4_TECHS: Partial<Record<TechnologyId, Technology>> = {
    // Ship Systems
    void_resonance: {
        id: "void_resonance",
        name: "Резонанс Пустоты",
        description:
            "Гармоники пространства Пустоты усиливают щиты на 40% и увеличивают урон всего оружия на 20%.",
        tier: 4,
        category: "ship_systems",
        prerequisites: ["phase_shield", "antimatter_weapons"],
        resources: {
            quantum_crystals: 8,
            energy_samples: 20,
            ancient_data: 15,
        },
        credits: 1800,
        scienceCost: 900,
        bonuses: [
            {
                type: "shield_strength",
                value: 0.3,
                description: "+30% к мощности щитов",
            },
            {
                type: "weapon_damage",
                value: 0.15,
                description: "+15% к урону оружия",
            },
        ],
        icon: "🌌",
        color: "#aa55ff",
        discovered: false,
        researched: false,
        researchProgress: 0,
    },

    // Biology
    stellar_genetics: {
        id: "stellar_genetics",
        name: "Звёздная генетика",
        description:
            "Изучение ДНК звёздных сущностей открывает путь к эволюции: +50% здоровья, +40% опыта, +20% скорость науки, -30% урон по экипажу в модулях.",
        tier: 4,
        category: "biology",
        prerequisites: ["genetic_enhancement", "neural_interface"],
        resources: {
            alien_biology: 20,
            quantum_crystals: 6,
            ancient_data: 15,
        },
        credits: 1800,
        scienceCost: 900,
        bonuses: [
            {
                type: "crew_health",
                value: 0.5,
                description: "+50% к здоровью экипажа",
            },
            {
                type: "crew_exp",
                value: 0.4,
                description: "+40% к опыту экипажа",
            },
            {
                type: "research_speed",
                value: 0.2,
                description: "+20% скорость исследований",
            },
            {
                type: "crew_damage_reduction",
                value: 0.3,
                description: "-30% урон по экипажу в модулях",
            },
        ],
        icon: "⭐",
        color: "#ffaa00",
        discovered: false,
        researched: false,
        researchProgress: 0,
    },

    // Artifacts
    artifact_mastery: {
        id: "artifact_mastery",
        name: "Мастерство Артефактов",
        description:
            "Полное единение с наследием Древних. +2 слота, +25% к эффектам всех активных артефактов.",
        tier: 4,
        category: "artifacts",
        prerequisites: ["ancient_resonance"],
        resources: {
            ancient_data: 30,
            quantum_crystals: 5,
            energy_samples: 15,
        },
        credits: 2000,
        scienceCost: 800,
        bonuses: [
            {
                type: "artifact_slots",
                value: 2,
                description: "+2 слота активных артефактов (итого 8)",
            },
            {
                type: "artifact_effect_boost",
                value: 0.25,
                description: "+25% к эффектам всех артефактов",
            },
        ],
        icon: "👁️",
        color: "#ff6600",
        discovered: false,
        researched: false,
        researchProgress: 0,
    },

    // Weapons
    modular_arsenal: {
        id: "modular_arsenal",
        name: "Модульный арсенал",
        description:
            "Переработка конструкции оружейных палуб позволяет разместить на 1 орудие больше в каждом отсеке и даёт +10% к урону. Двойные палубы вмещают 3 орудия вместо 2.",
        tier: 4,
        category: "weapons",
        prerequisites: ["antimatter_weapons", "quantum_torpedo"],
        resources: { tech_salvage: 15, rare_minerals: 10, quantum_crystals: 3 },
        credits: 800,
        scienceCost: 400,
        bonuses: [
            {
                type: "weapon_slots",
                value: 1,
                description: "+1 слот оружия в каждой оружейной палубе",
            },
            {
                type: "weapon_damage",
                value: 0.1,
                description: "+10% к урону оружия",
            },
        ],
        icon: "🔫",
        color: "#ff4444",
        discovered: false,
        researched: false,
        researchProgress: 0,
    },
};
