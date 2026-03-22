import type { Technology, TechnologyId } from "@/game/types";

// ═══════════════════════════════════════════════════════════════
// TIER 1 - Basic Technologies (scienceCost: 50-100)
// ═══════════════════════════════════════════════════════════════

export const TIER1_TECHS: Partial<Record<TechnologyId, Technology>> = {
    // Ship Systems
    reinforced_hull: {
        id: "reinforced_hull",
        name: "Усиленный корпус",
        description:
            "Улучшенные сплавы повышают прочность всех модулей на 10%.",
        tier: 1,
        category: "ship_systems",
        prerequisites: [],
        resources: { rare_minerals: 5 },
        credits: 200,
        scienceCost: 80,
        bonuses: [
            {
                type: "module_health",
                value: 0.1,
                description: "+10% к здоровью модулей",
            },
        ],
        icon: "🛡️",
        color: "#00ff41",
        discovered: true, // Starting tech
        researched: false,
        researchProgress: 0,
    },

    efficient_reactor: {
        id: "efficient_reactor",
        name: "Эффективный реактор",
        description: "Оптимизация реактора даёт +15% к генерации энергии.",
        tier: 1,
        category: "ship_systems",
        prerequisites: [],
        resources: { rare_minerals: 3 },
        credits: 150,
        scienceCost: 60,
        bonuses: [
            {
                type: "module_power",
                value: 0.15,
                description: "+15% к энергии модулей",
            },
        ],
        icon: "⚛️",
        color: "#ffb000",
        discovered: true,
        researched: false,
        researchProgress: 0,
    },

    // Weapons
    targeting_matrix: {
        id: "targeting_matrix",
        name: "Матрица прицеливания",
        description:
            "Улучшенные системы наведения увеличивают урон оружия на 10%.",
        tier: 1,
        category: "weapons",
        prerequisites: [],
        resources: { tech_salvage: 5 },
        credits: 200,
        scienceCost: 80,
        bonuses: [
            {
                type: "weapon_damage",
                value: 0.1,
                description: "+10% к урону оружия",
            },
        ],
        icon: "🎯",
        color: "#ff0040",
        discovered: true,
        researched: false,
        researchProgress: 0,
    },

    ion_cannon: {
        id: "ion_cannon",
        name: "Ионная пушка",
        description:
            "Базовое ионное орудие — наносит огромный урон щитам (×4), но не повреждает корпус. Открывает путь к плазменному оружию.",
        tier: 1,
        category: "weapons",
        prerequisites: [],
        resources: { tech_salvage: 4, energy_samples: 4 },
        credits: 450,
        scienceCost: 180,
        bonuses: [
            {
                type: "new_weapon",
                value: 1,
                description: "Разблокирует крафт ионной пушки",
            },
        ],
        icon: "⚡",
        color: "#4488ff",
        discovered: true,
        researched: false,
        researchProgress: 0,
    },

    // Science
    scanner_mk2: {
        id: "scanner_mk2",
        name: "Модуль сканера +1",
        description:
            "Улучшение сканера увеличивает дальность сканирования на +1.",
        tier: 1,
        category: "science",
        prerequisites: [],
        resources: { ancient_data: 3 },
        credits: 250,
        scienceCost: 100,
        bonuses: [
            {
                type: "scan_range",
                value: 1,
                description: "+1 к дальности сканирования",
            },
        ],
        icon: "📡",
        color: "#00d4ff",
        discovered: true,
        researched: false,
        researchProgress: 0,
    },

    // Engineering
    automated_repair: {
        id: "automated_repair",
        name: "Автоматический ремонт",
        description:
            "Наниты-ремонтники восстанавливают 2% здоровья модулей каждый ход.",
        tier: 1,
        category: "engineering",
        prerequisites: [],
        resources: { tech_salvage: 3, rare_minerals: 3 },
        credits: 300,
        scienceCost: 100,
        bonuses: [
            {
                type: "nanite_repair",
                value: 2,
                description: "+2% ремонт модулей за ход",
            },
        ],
        icon: "🔧",
        color: "#00ffaa",
        discovered: true,
        researched: false,
        researchProgress: 0,
    },

    // Biology
    medbay_upgrade: {
        id: "medbay_upgrade",
        name: "Улучшенный медотсек",
        description:
            "Медицинские технологии увеличивают здоровье экипажа на 15%.",
        tier: 1,
        category: "biology",
        prerequisites: [],
        resources: { alien_biology: 3 },
        credits: 200,
        scienceCost: 80,
        bonuses: [
            {
                type: "crew_health",
                value: 0.15,
                description: "+15% к здоровью экипажа",
            },
        ],
        icon: "💉",
        color: "#ff44ff",
        discovered: true,
        researched: false,
        researchProgress: 0,
    },

    // Artifact Branch
    artifact_study: {
        id: "artifact_study",
        name: "Изучение Артефактов",
        description:
            "Базовые протоколы работы с реликвиями Древних. Открывает 4-й слот активного артефакта.",
        tier: 1,
        category: "artifacts",
        prerequisites: [],
        resources: { ancient_data: 5 },
        credits: 300,
        scienceCost: 100,
        bonuses: [
            {
                type: "artifact_slots",
                value: 1,
                description: "+1 слот активного артефакта (итого 4)",
            },
        ],
        icon: "🔮",
        color: "#ff6600",
        discovered: true,
        researched: false,
        researchProgress: 0,
    },
};
