import type { Technology, TechnologyId } from "@/game/types";

// ═══════════════════════════════════════════════════════════════
// TIER 2 - Advanced Technologies (scienceCost: 150-250)
// ═══════════════════════════════════════════════════════════════

export const TIER2_TECHS: Partial<Record<TechnologyId, Technology>> = {
    // Biology
    xenobiology: {
        id: "xenobiology",
        name: "Ксенобиология",
        description:
            "Изучение инопланетной биологии даёт +10% к здоровью экипажа и позволяет лечить мутации на медицинских станциях.",
        tier: 2,
        category: "biology",
        prerequisites: ["medbay_upgrade"],
        resources: { alien_biology: 5, rare_minerals: 3 },
        credits: 500,
        scienceCost: 200,
        bonuses: [
            {
                type: "crew_health",
                value: 0.1,
                description: "+10% к здоровью экипажа",
            },
            {
                type: "special_ability",
                value: 1,
                description:
                    "Разблокирует лечение мутаций на медицинских станциях",
            },
        ],
        icon: "🧬",
        color: "#00ff88",
        discovered: false,
        researched: false,
        researchProgress: 0,
    },

    // Ship Systems
    ion_drive: {
        id: "ion_drive",
        name: "Ионный двигатель",
        description:
            "Ионная тяга снижает расход топлива на 20% и сокращает время межтирового перелёта на 1 ход (прыжки в соседний тир становятся моментальными).",
        tier: 2,
        category: "ship_systems",
        prerequisites: ["efficient_reactor"],
        resources: { energy_samples: 5, rare_minerals: 5 },
        credits: 350,
        scienceCost: 170,
        bonuses: [
            {
                type: "fuel_efficiency",
                value: 0.2,
                description: "-20% расход топлива",
            },
        ],
        icon: "🚀",
        color: "#ffb000",
        discovered: false,
        researched: false,
        researchProgress: 0,
    },

    shield_booster: {
        id: "shield_booster",
        name: "Усилитель щитов",
        description: "Генераторы щитов новой конструкции дают +25% к защите.",
        tier: 2,
        category: "ship_systems",
        prerequisites: ["reinforced_hull"],
        resources: { rare_minerals: 8, energy_samples: 3 },
        credits: 400,
        scienceCost: 180,
        bonuses: [
            {
                type: "shield_strength",
                value: 0.25,
                description: "+25% к щитам",
            },
        ],
        icon: "🛡️",
        color: "#0080ff",
        discovered: false,
        researched: false,
        researchProgress: 0,
    },

    // Weapons
    combat_drones: {
        id: "combat_drones",
        name: "Боевые дроны",
        description:
            "Боевые дроны атакуют дважды за выстрел, давая +10% к урону.",
        tier: 2,
        category: "weapons",
        prerequisites: ["targeting_matrix"],
        resources: { tech_salvage: 8, rare_minerals: 5 },
        credits: 400,
        scienceCost: 200,
        bonuses: [
            {
                type: "weapon_damage",
                value: 0.1,
                description: "+10% к урону оружия",
            },
            {
                type: "new_weapon",
                value: 3,
                description: "Открывает боевые дроны",
            },
        ],
        icon: "🤖",
        color: "#ff6600",
        discovered: false,
        researched: false,
        researchProgress: 0,
    },

    plasma_weapons: {
        id: "plasma_weapons",
        name: "Плазменное оружие",
        description:
            "Плазменные орудия пробивают 25% брони и наносят +30% урона по щитам. +10% к общему урону.",
        tier: 2,
        category: "weapons",
        prerequisites: ["targeting_matrix", "ion_cannon"],
        resources: { energy_samples: 5, tech_salvage: 8 },
        credits: 500,
        scienceCost: 220,
        bonuses: [
            {
                type: "new_weapon",
                value: 1,
                description: "Открывает плазменное оружие",
            },
            {
                type: "weapon_damage",
                value: 0.1,
                description: "+10% к урону оружия",
            },
        ],
        icon: "🔥",
        color: "#ff6600",
        discovered: false,
        researched: false,
        researchProgress: 0,
    },

    // Science
    lab_network: {
        id: "lab_network",
        name: "Лабораторная сеть",
        description:
            "Объединённая сеть лабораторий ускоряет все исследования на 25%.",
        tier: 2,
        category: "science",
        prerequisites: ["scanner_mk2"],
        resources: { ancient_data: 5, tech_salvage: 5 },
        credits: 400,
        scienceCost: 190,
        bonuses: [
            {
                type: "research_speed",
                value: 0.25,
                description: "+25% скорость исследований",
            },
        ],
        icon: "🔬",
        color: "#9933ff",
        discovered: false,
        researched: false,
        researchProgress: 0,
    },

    quantum_scanner: {
        id: "quantum_scanner",
        name: "Модуль сканера +2",
        description:
            "Квантовые сенсоры увеличивают дальность сканирования на +2.",
        tier: 2,
        category: "science",
        prerequisites: ["scanner_mk2"],
        resources: { ancient_data: 8, quantum_crystals: 1 },
        credits: 600,
        scienceCost: 250,
        bonuses: [
            {
                type: "scan_range",
                value: 2,
                description: "+2 к дальности сканирования",
            },
        ],
        icon: "🌀",
        color: "#9933ff",
        discovered: false,
        researched: false,
        researchProgress: 0,
    },

    // Engineering
    cargo_expansion: {
        id: "cargo_expansion",
        name: "Расширение трюма",
        description:
            "Технологии компактного хранения увеличивают грузовместимость корабля на 20%.",
        tier: 2,
        category: "engineering",
        prerequisites: ["automated_repair"],
        resources: { rare_minerals: 15, tech_salvage: 10 },
        credits: 500,
        scienceCost: 250,
        bonuses: [
            {
                type: "cargo_capacity",
                value: 0.2,
                description: "+20% к грузовместимости",
            },
        ],
        icon: "📦",
        color: "#ff0040",
        discovered: false,
        researched: false,
        researchProgress: 0,
    },

    // Biology
    crew_training: {
        id: "crew_training",
        name: "Программа подготовки",
        description:
            "Улучшенное обучение даёт экипажу +25% к получаемому опыту.",
        tier: 2,
        category: "biology",
        prerequisites: ["medbay_upgrade"],
        resources: { alien_biology: 5, ancient_data: 3 },
        credits: 400,
        scienceCost: 200,
        bonuses: [
            {
                type: "crew_exp",
                value: 0.25,
                description: "+25% к опыту экипажа",
            },
        ],
        icon: "🎓",
        color: "#00ff41",
        discovered: false,
        researched: false,
        researchProgress: 0,
    },

    // Artifacts
    relic_chamber: {
        id: "relic_chamber",
        name: "Реликварий",
        description:
            "Специальная камера хранения усиливает взаимодействие с артефактами. +1 слот, +10% к эффектам артефактов.",
        tier: 2,
        category: "artifacts",
        prerequisites: ["artifact_study"],
        resources: { ancient_data: 10, quantum_crystals: 1 },
        credits: 600,
        scienceCost: 250,
        bonuses: [
            {
                type: "artifact_slots",
                value: 1,
                description: "+1 слот активного артефакта (итого 5)",
            },
            {
                type: "artifact_effect_boost",
                value: 0.1,
                description: "+10% к эффектам всех артефактов",
            },
        ],
        icon: "🏺",
        color: "#ff6600",
        discovered: false,
        researched: false,
        researchProgress: 0,
    },
    bio_membrane_shield: {
        id: "bio_membrane_shield",
        name: "Биомембранный щит",
        description:
            "Живые мембраны газовых гигантов обволакивают генератор щита и отсеки экипажа: +25% к регенерации щитов, −15% урона по экипажу в бою.",
        tier: 2,
        category: "biology",
        prerequisites: ["medbay_upgrade"],
        resources: { void_membrane: 3, alien_biology: 4 },
        credits: 700,
        scienceCost: 280,
        bonuses: [
            {
                type: "shield_regen",
                value: 0.25,
                description: "+25% к скорости регенерации щитов",
            },
            {
                type: "crew_damage_reduction",
                value: 0.15,
                description: "−15% урона по экипажу в модулях",
            },
        ],
        icon: "🫧",
        color: "#7b4fff",
        discovered: false,
        researched: false,
        researchProgress: 0,
    },

    expedition_kits: {
        id: "expedition_kits",
        name: "Комплекты эксипедиции",
        description:
            "Стимпаки, ручные дроны и разведывательные зонды расширяют возможности экспедиций на поверхности планет. Каждая экспедиция получает +2 очка действий.",
        tier: 2,
        category: "engineering",
        prerequisites: ["automated_repair"],
        resources: { tech_salvage: 6, rare_minerals: 4, alien_biology: 3 },
        credits: 700,
        scienceCost: 300,
        bonuses: [
            {
                type: "expedition_ap",
                value: 2,
                description: "+2 очка действий к каждой экспедиции",
            },
        ],
        icon: "🎒",
        color: "#00d4ff",
        discovered: false,
        researched: false,
        researchProgress: 0,
    },
};
