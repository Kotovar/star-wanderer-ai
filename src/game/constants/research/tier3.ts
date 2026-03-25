import type { Technology, TechnologyId } from "@/game/types";

// ═══════════════════════════════════════════════════════════════
// TIER 3 - Elite Technologies (scienceCost: 300-500)
// ═══════════════════════════════════════════════════════════════

export const TIER3_TECHS: Partial<Record<TechnologyId, Technology>> = {
    // Ship Systems
    singularity_reactor: {
        id: "singularity_reactor",
        name: "Реактор сингулярности",
        description:
            "Реактор на основе микросингулярности даёт +30% к мощности всех систем корабля.",
        tier: 3,
        category: "ship_systems",
        prerequisites: ["ion_drive"],
        resources: { quantum_crystals: 3, energy_samples: 12 },
        credits: 900,
        scienceCost: 450,
        bonuses: [
            {
                type: "module_power",
                value: 0.3,
                description: "+30% к мощности систем",
            },
            {
                type: "fuel_efficiency",
                value: 0.15,
                description: "-15% расход топлива",
            },
        ],
        icon: "⚛️",
        color: "#00d4ff",
        discovered: false,
        researched: false,
        researchProgress: 0,
    },

    phase_shield: {
        id: "phase_shield",
        name: "Фазовый щит",
        description:
            "Щиты с фазовым сдвигом имеют 20% шанс полностью поглотить атаку.",
        tier: 3,
        category: "ship_systems",
        prerequisites: ["shield_booster"],
        resources: { quantum_crystals: 3, energy_samples: 10 },
        credits: 900,
        scienceCost: 450,
        bonuses: [
            {
                type: "shield_strength",
                value: 0.3,
                description: "+30% к щитам",
            },
            {
                type: "special_ability",
                value: 0.2,
                description: "20% шанс поглотить атаку",
            },
        ],
        icon: "✨",
        color: "#aa55ff",
        discovered: false,
        researched: false,
        researchProgress: 0,
    },

    storm_shields: {
        id: "storm_shields",
        name: "Штормовые щиты",
        description:
            "Специальные экранирующие поля снижают урон от всех типов штормов на 50% и повышают прочность корпуса на 10%.",
        tier: 3,
        category: "ship_systems",
        prerequisites: ["shield_booster"],
        resources: {
            quantum_crystals: 3,
            energy_samples: 10,
            rare_minerals: 8,
        },
        credits: 850,
        scienceCost: 420,
        bonuses: [
            {
                type: "special_ability",
                value: 0.5,
                description: "-50% урон от штормов",
            },
            {
                type: "module_health",
                value: 0.1,
                description: "+10% к здоровью модулей",
            },
        ],
        icon: "🌪️",
        color: "#00aaff",
        discovered: false,
        researched: false,
        researchProgress: 0,
    },

    // Weapons
    quantum_torpedo: {
        id: "quantum_torpedo",
        name: "Квантовая торпеда",
        description:
            "Квантовые торпеды полностью игнорируют щиты и атакуют модули напрямую. +20% к урону.",
        tier: 3,
        category: "weapons",
        prerequisites: ["plasma_weapons", "combat_drones"],
        resources: {
            quantum_crystals: 2,
            energy_samples: 12,
            tech_salvage: 10,
        },
        credits: 1100,
        scienceCost: 500,
        bonuses: [
            {
                type: "weapon_damage",
                value: 0.2,
                description: "+20% к урону оружия",
            },
            {
                type: "new_weapon",
                value: 4,
                description: "Открывает квантовые торпеды",
            },
        ],
        icon: "💣",
        color: "#ff00aa",
        discovered: false,
        researched: false,
        researchProgress: 0,
    },

    antimatter_weapons: {
        id: "antimatter_weapons",
        name: "Антивещественное оружие",
        description:
            "Орудия на антиматерии наносят ×2.5 урона по щитам. +15% к общему урону.",
        tier: 3,
        category: "weapons",
        prerequisites: ["plasma_weapons"],
        resources: {
            energy_samples: 15,
            quantum_crystals: 2,
            tech_salvage: 10,
        },
        credits: 1000,
        scienceCost: 500,
        bonuses: [
            {
                type: "weapon_damage",
                value: 0.15,
                description: "+15% к урону оружия",
            },
            {
                type: "new_weapon",
                value: 2,
                description: "Открывает антивещественное оружие",
            },
        ],
        icon: "💥",
        color: "#ff00ff",
        discovered: false,
        researched: false,
        researchProgress: 0,
    },

    // Biology
    neural_interface: {
        id: "neural_interface",
        name: "Нейронный интерфейс",
        description:
            "Нейроинтерфейс соединяет разум экипажа с кораблём, давая +30% опыта и ускоряя исследования.",
        tier: 3,
        category: "biology",
        prerequisites: ["crew_training"],
        resources: {
            alien_biology: 10,
            quantum_crystals: 2,
            ancient_data: 8,
        },
        credits: 800,
        scienceCost: 400,
        bonuses: [
            {
                type: "crew_exp",
                value: 0.3,
                description: "+30% к опыту экипажа",
            },
            {
                type: "research_speed",
                value: 0.15,
                description: "+15% скорость исследований",
            },
        ],
        icon: "🧠",
        color: "#ff44ff",
        discovered: false,
        researched: false,
        researchProgress: 0,
    },

    genetic_enhancement: {
        id: "genetic_enhancement",
        name: "Генетическое улучшение",
        description:
            "Биологические улучшения увеличивают здоровье экипажа на 30%.",
        tier: 3,
        category: "biology",
        prerequisites: ["xenobiology"],
        resources: { alien_biology: 15, quantum_crystals: 1 },
        credits: 750,
        scienceCost: 400,
        bonuses: [
            {
                type: "crew_health",
                value: 0.3,
                description: "+30% к здоровью экипажа",
            },
        ],
        icon: "🧬",
        color: "#00ff41",
        discovered: false,
        researched: false,
        researchProgress: 0,
    },

    // Engineering
    nanite_hull: {
        id: "nanite_hull",
        name: "Нанитовая обшивка",
        description:
            "Наниты в корпусе восстанавливают 5% здоровья всех модулей каждый ход.",
        tier: 3,
        category: "engineering",
        prerequisites: ["automated_repair", "shield_booster"],
        resources: {
            quantum_crystals: 2,
            rare_minerals: 15,
            energy_samples: 8,
        },
        credits: 800,
        scienceCost: 400,
        bonuses: [
            {
                type: "nanite_repair",
                value: 5,
                description: "+5% ремонт модулей за ход",
            },
        ],
        icon: "🤖",
        color: "#00ffff",
        discovered: false,
        researched: false,
        researchProgress: 0,
    },

    planetary_drill: {
        id: "planetary_drill",
        name: "Планетарный бур",
        description:
            "Адаптирует буровой модуль для работы на поверхности планет. Тип планеты определяет добываемые ресурсы: лёд — вода и минералы, вулканы — энергия, джунгли — биоматериалы и т.д.",
        tier: 3,
        category: "engineering",
        prerequisites: ["cargo_expansion"],
        resources: { tech_salvage: 12, rare_minerals: 8, energy_samples: 5 },
        credits: 900,
        scienceCost: 450,
        bonuses: [
            {
                type: "special_ability",
                value: 1,
                description: "Разблокирует добычу на поверхности пустых планет",
            },
        ],
        icon: "⛏️",
        color: "#ffb000",
        discovered: false,
        researched: false,
        researchProgress: 0,
    },

    // Science
    deep_scan: {
        id: "deep_scan",
        name: "Модуль сканера +3",
        description: "Глубокое сканирование увеличивает дальность на +3.",
        tier: 3,
        category: "science",
        prerequisites: ["quantum_scanner"],
        resources: { ancient_data: 15, quantum_crystals: 2 },
        credits: 700,
        scienceCost: 350,
        bonuses: [
            {
                type: "scan_range",
                value: 3,
                description: "+3 к дальности сканирования",
            },
        ],
        icon: "🔮",
        color: "#00d4ff",
        discovered: false,
        researched: false,
        researchProgress: 0,
    },

    atmospheric_analysis: {
        id: "atmospheric_analysis",
        name: "Атмосферный анализ",
        description:
            "Учёный может провести однократный забор атмосферных образцов с любой пустой планеты. Тип атмосферы определяет исследовательские ресурсы.",
        tier: 3,
        category: "science",
        prerequisites: ["lab_network", "quantum_scanner"],
        resources: { ancient_data: 10, alien_biology: 8, quantum_crystals: 1 },
        credits: 800,
        scienceCost: 400,
        bonuses: [
            {
                type: "special_ability",
                value: 1,
                description: "Разблокирует атмосферный анализ пустых планет",
            },
        ],
        icon: "🌫️",
        color: "#00d4ff",
        discovered: false,
        researched: false,
        researchProgress: 0,
    },

    // Artifacts
    ancient_resonance: {
        id: "ancient_resonance",
        name: "Резонанс Древних",
        description:
            "Резонансная настройка усиливает реликвии через корабельные системы. +1 слот, +15% к эффектам артефактов.",
        tier: 3,
        category: "artifacts",
        prerequisites: ["relic_chamber", "quantum_scanner"],
        resources: { ancient_data: 20, quantum_crystals: 2, energy_samples: 8 },
        credits: 1000,
        scienceCost: 450,
        bonuses: [
            {
                type: "artifact_slots",
                value: 1,
                description: "+1 слот активного артефакта (итого 6)",
            },
            {
                type: "artifact_effect_boost",
                value: 0.15,
                description: "+15% к эффектам всех артефактов",
            },
        ],
        icon: "✨",
        color: "#ff6600",
        discovered: false,
        researched: false,
        researchProgress: 0,
    },
};
