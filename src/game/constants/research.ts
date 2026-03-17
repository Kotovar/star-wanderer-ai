import type {
    ResearchCategory,
    ResearchResource,
    ResearchResourceType,
    ResearchTier,
    Technology,
    TechnologyId,
} from "@/game/types";

export const RESEARCH_RESOURCES: Record<
    ResearchResourceType,
    ResearchResource
> = {
    ancient_data: {
        id: "ancient_data",
        name: "Древние данные",
        description: "Зашифрованная информация цивилизации Древних",
        icon: "📊",
        color: "#00d4ff",
        rarity: "uncommon",
    },
    rare_minerals: {
        id: "rare_minerals",
        name: "Редкие минералы",
        description: "Экзотические элементы с уникальными свойствами",
        icon: "💎",
        color: "#ff6b35",
        rarity: "common",
    },
    alien_biology: {
        id: "alien_biology",
        name: "Чужеродная биология",
        description: "Образцы инопланетной флоры и фауны",
        icon: "🧬",
        color: "#00ff41",
        rarity: "uncommon",
    },
    energy_samples: {
        id: "energy_samples",
        name: "Образцы энергии",
        description: "Концентрированные энергетические сигнатуры",
        icon: "⚡",
        color: "#ffb000",
        rarity: "rare",
    },
    quantum_crystals: {
        id: "quantum_crystals",
        name: "Квантовые кристаллы",
        description: "Кристаллы с квантовыми свойствами из аномалий",
        icon: "💠",
        color: "#9933ff",
        rarity: "legendary",
    },
    tech_salvage: {
        id: "tech_salvage",
        name: "Технологический лом",
        description: "Восстановленные компоненты вражеских технологий",
        icon: "🔧",
        color: "#ff00ff",
        rarity: "common",
    },
};

/**
 * Research tree data
 */
export const RESEARCH_TREE: Record<TechnologyId, Technology> = {
    // ═══════════════════════════════════════════════════════════════
    // TIER 1 - Basic Technologies (scienceCost: 50-100)
    // ═══════════════════════════════════════════════════════════════

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

    // ═══════════════════════════════════════════════════════════════
    // TIER 2 - Advanced Technologies (scienceCost: 150-250)
    // ═══════════════════════════════════════════════════════════════

    ion_drive: {
        id: "ion_drive",
        name: "Ионный двигатель",
        description:
            "Ионная тяга снижает расход топлива на 30% и ускоряет перелёты.",
        tier: 2,
        category: "ship_systems",
        prerequisites: ["efficient_reactor"],
        resources: { energy_samples: 5, rare_minerals: 5 },
        credits: 350,
        scienceCost: 170,
        bonuses: [
            {
                type: "fuel_efficiency",
                value: 0.3,
                description: "-30% расход топлива",
            },
            {
                type: "module_power",
                value: 0.1,
                description: "+10% к энергии систем",
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

    combat_drones: {
        id: "combat_drones",
        name: "Боевые дроны",
        description:
            "Автономные дроны патрулируют корабль и атакуют цели, давая +15% к урону.",
        tier: 2,
        category: "weapons",
        prerequisites: ["targeting_matrix"],
        resources: { tech_salvage: 8, rare_minerals: 5 },
        credits: 400,
        scienceCost: 200,
        bonuses: [
            {
                type: "weapon_damage",
                value: 0.15,
                description: "+15% к урону оружия",
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
            "Открывает доступ к плазменным орудиям, игнорирующим 25% брони.",
        tier: 2,
        category: "weapons",
        prerequisites: ["targeting_matrix"],
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
                value: 0.15,
                description: "+15% к урону оружия",
            },
        ],
        icon: "🔥",
        color: "#ff6600",
        discovered: false,
        researched: false,
        researchProgress: 0,
    },

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

    cargo_expansion: {
        id: "cargo_expansion",
        name: "Расширение трюма",
        description: "Технологии компактного хранения увеличивают трюм на 30%.",
        tier: 2,
        category: "engineering",
        prerequisites: ["automated_repair"],
        resources: { rare_minerals: 15, tech_salvage: 10 },
        credits: 500,
        scienceCost: 250,
        bonuses: [
            {
                type: "cargo_capacity",
                value: 0.3,
                description: "+30% к грузовместимости",
            },
        ],
        icon: "📦",
        color: "#ff0040",
        discovered: false,
        researched: false,
        researchProgress: 0,
    },

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

    // ═══════════════════════════════════════════════════════════════
    // TIER 3 - Elite Technologies (scienceCost: 300-500)
    // ═══════════════════════════════════════════════════════════════

    singularity_reactor: {
        id: "singularity_reactor",
        name: "Реактор сингулярности",
        description:
            "Реактор на основе микросингулярности даёт +50% к мощности всех систем корабля.",
        tier: 3,
        category: "ship_systems",
        prerequisites: ["ion_drive"],
        resources: { quantum_crystals: 3, energy_samples: 12 },
        credits: 900,
        scienceCost: 450,
        bonuses: [
            {
                type: "module_power",
                value: 0.5,
                description: "+50% к мощности систем",
            },
            {
                type: "fuel_efficiency",
                value: 0.2,
                description: "-20% расход топлива",
            },
        ],
        icon: "⚛️",
        color: "#00d4ff",
        discovered: false,
        researched: false,
        researchProgress: 0,
    },

    quantum_torpedo: {
        id: "quantum_torpedo",
        name: "Квантовая торпеда",
        description:
            "Торпеды с квантовым зарядом пробивают щиты и наносят +30% урона.",
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
                value: 0.3,
                description: "+30% к урону оружия",
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
                value: 0.5,
                description: "+50% к щитам",
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

    antimatter_weapons: {
        id: "antimatter_weapons",
        name: "Антивещественное оружие",
        description: "Орудия на антиматерии наносят двойной урон по щитам.",
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
                value: 0.25,
                description: "+25% к урону оружия",
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

    genetic_enhancement: {
        id: "genetic_enhancement",
        name: "Генетическое улучшение",
        description:
            "Биологические улучшения увеличивают здоровье экипажа на 30%.",
        tier: 3,
        category: "biology",
        prerequisites: ["crew_training"],
        resources: { alien_biology: 15, quantum_crystals: 1 },
        credits: 750,
        scienceCost: 400,
        bonuses: [
            {
                type: "crew_health",
                value: 0.3,
                description: "+30% к здоровью экипажа",
            },
            {
                type: "crew_exp",
                value: 0.15,
                description: "+15% к опыту экипажа",
            },
        ],
        icon: "🧬",
        color: "#00ff41",
        discovered: false,
        researched: false,
        researchProgress: 0,
    },

    // ═══════════════════════════════════════════════════════════════
    // TIER 4 - Ancient Technologies (Endgame) (scienceCost: 800-1000)
    // ═══════════════════════════════════════════════════════════════

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
                value: 0.4,
                description: "+40% к мощности щитов",
            },
            {
                type: "weapon_damage",
                value: 0.2,
                description: "+20% к урону оружия",
            },
        ],
        icon: "🌌",
        color: "#aa55ff",
        discovered: false,
        researched: false,
        researchProgress: 0,
    },

    stellar_genetics: {
        id: "stellar_genetics",
        name: "Звёздная генетика",
        description:
            "Изучение ДНК звёздных сущностей открывает путь к эволюции: +50% здоровья, +40% опыта экипажа, +20% скорость науки.",
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
        ],
        icon: "⭐",
        color: "#ffaa00",
        discovered: false,
        researched: false,
        researchProgress: 0,
    },

    ancient_power: {
        id: "ancient_power",
        name: "Сила Древних",
        description:
            "Технологии Древних дают +50% ко всем характеристикам корабля.",
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
            "Двигатель Древних позволяет перемещаться без затрат топлива.",
        tier: 5,
        category: "ancient_tech",
        prerequisites: ["ancient_power"],
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

    // ═══════════════════════════════════════════════════════════════
    // ARTIFACT BRANCH - Technologies to master ancient relics
    // ═══════════════════════════════════════════════════════════════

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

    relic_chamber: {
        id: "relic_chamber",
        name: "Реликварий",
        description:
            "Специальная камера хранения усиливает взаимодействие с артефактами. +1 слот, +5% к эффектам артефактов.",
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
                value: 0.05,
                description: "+5% к эффектам всех артефактов",
            },
        ],
        icon: "🏺",
        color: "#ff6600",
        discovered: false,
        researched: false,
        researchProgress: 0,
    },

    ancient_resonance: {
        id: "ancient_resonance",
        name: "Резонанс Древних",
        description:
            "Резонансная настройка усиливает реликвии через корабельные системы. +1 слот, +10% к эффектам артефактов.",
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
                value: 0.1,
                description: "+10% к эффектам всех артефактов",
            },
        ],
        icon: "✨",
        color: "#ff6600",
        discovered: false,
        researched: false,
        researchProgress: 0,
    },

    artifact_mastery: {
        id: "artifact_mastery",
        name: "Мастерство Артефактов",
        description:
            "Полное единение с наследием Древних. +2 слота, +15% к эффектам всех активных артефактов.",
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
                value: 0.15,
                description: "+15% к эффектам всех артефактов",
            },
        ],
        icon: "👁️",
        color: "#ff6600",
        discovered: false,
        researched: false,
        researchProgress: 0,
    },
};

/**
 * Get technologies by tier
 */
export function getTechnologiesByTier(tier: ResearchTier): Technology[] {
    return Object.values(RESEARCH_TREE).filter((t) => t.tier === tier);
}

/**
 * Get technologies by category
 */
export function getTechnologiesByCategory(
    category: ResearchCategory,
): Technology[] {
    return Object.values(RESEARCH_TREE).filter((t) => t.category === category);
}

/**
 * Check if technology can be researched
 */
export function canResearchTech(
    techId: TechnologyId,
    researchedTechs: string[],
): boolean {
    const tech = RESEARCH_TREE[techId];
    if (!tech) return false;
    if (tech.researched) return false;

    // Check prerequisites
    for (const prereq of tech.prerequisites) {
        if (!researchedTechs.includes(prereq)) {
            return false;
        }
    }

    return true;
}

/**
 * Get available technologies to research
 */
export function getAvailableTechnologies(
    researchedTechs: string[],
): Technology[] {
    return Object.values(RESEARCH_TREE).filter(
        (tech) => !tech.researched && canResearchTech(tech.id, researchedTechs),
    );
}
