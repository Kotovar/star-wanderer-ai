import type { PlanetSpecialization, PlanetType, RaceId } from "../types";

export const PLANET_TYPES: PlanetType[] = [
    "Пустынная",
    "Ледяная",
    "Лесная",
    "Вулканическая",
    "Океаническая",
    "Радиоактивная",
    "Тропическая",
    "Арктическая",
    "Разрушенная войной",
    "Планета-кольцо",
    "Приливная",
];

// Planet type descriptions
export const PLANET_DESCRIPTIONS: Record<PlanetType, string> = {
    Пустынная:
        "Засушливый мир с экстремальными перепадами температур. Богата минералами, но требует импорта воды.",
    Ледяная:
        "Замерзший мир с подлёдными океанами. Перспективен для добычи дейтерия и редких газов.",
    Лесная: "Планета с богатой биосферой и умеренным климатом. Идеальна для колонизации и сельского хозяйства.",
    Вулканическая:
        "Геологически активный мир с постоянными извержениями. Богата серой и редкими металлами.",
    Океаническая:
        "Водный мир с архипелагами. Перспективен для рыболовства и добычи морских ресурсов.",
    Радиоактивная:
        "Мир с высоким уровнем радиации после катастрофы или бомбардировки. Требует защитных костюмов.",
    Тропическая:
        "Влажная планета с густыми джунглями. Богата биоресурсами, но опасна болезнями.",
    Арктическая:
        "Холодный мир с ледяными пустошами. Перспективен для добычи льда и криогенных минералов.",
    "Разрушенная войной":
        "Планета, опустошённая древними конфликтами. Полна руин, артефактов и опасных зон.",
    "Планета-кольцо":
        "Планета с выраженной системой колец. Кольца богаты минералами и льдом.",
    Приливная:
        "Мир с мощной приливной активностью. Геотермальная энергия доступна, но поверхность нестабильна.",
};

export const PLANET_COLORS: Record<
    PlanetType,
    { primary: string; secondary: string; accent?: string }
> = {
    Пустынная: { primary: "#c97f3f", secondary: "#8b5a2b", accent: "#e6a85c" },
    Ледяная: { primary: "#5a9fd4", secondary: "#2d5a87", accent: "#a8d4f0" },
    Лесная: { primary: "#3d8b3d", secondary: "#1a4a2a", accent: "#5cb85c" },
    Вулканическая: {
        primary: "#8b3a3a",
        secondary: "#4a1a1a",
        accent: "#ff6b35",
    },
    Океаническая: {
        primary: "#2d6a87",
        secondary: "#1a3a5a",
        accent: "#4a9fd4",
    },
    Радиоактивная: {
        primary: "#4a8a3a",
        secondary: "#2a4a1a",
        accent: "#7fff00",
    },
    Тропическая: {
        primary: "#2d8a5a",
        secondary: "#1a5a3a",
        accent: "#5cd48a",
    },
    Арктическая: {
        primary: "#4a7a9a",
        secondary: "#2a4a5a",
        accent: "#8ab8d4",
    },
    "Разрушенная войной": {
        primary: "#4a3a3a",
        secondary: "#2a1a1a",
        accent: "#ff4444",
    },
    "Планета-кольцо": {
        primary: "#3a4a7a",
        secondary: "#1a2a4a",
        accent: "#8a9aba",
    },
    Приливная: { primary: "#2d5a8a", secondary: "#1a3a5a", accent: "#5a9fd4" },
};

export const PLANET_COLORS_IN_SECTOR: Record<
    PlanetType,
    { base: string; atmosphere: string; rings?: string }
> = {
    Пустынная: { base: "#d4a574", atmosphere: "#e8c89e" }, // Mars-like
    Ледяная: { base: "#a8d4e6", atmosphere: "#d4e8f2" }, // Europa-like
    Лесная: { base: "#4a7c59", atmosphere: "#6b9b7a" }, // Earth-like green
    Вулканическая: { base: "#8b4513", atmosphere: "#ff4500" }, // Io-like
    Океаническая: { base: "#1e90ff", atmosphere: "#87ceeb" }, // Earth-like blue
    Радиоактивная: { base: "#5a8f3a", atmosphere: "#7fff00" }, // Green radioactive glow
    Тропическая: { base: "#228b22", atmosphere: "#90ee90" }, // Lush green tropical
    Арктическая: { base: "#b0e0e6", atmosphere: "#f0f8ff" }, // Ice blue arctic
    "Разрушенная войной": { base: "#4a4a4a", atmosphere: "#8b0000" }, // Dark grey with red haze
    "Планета-кольцо": {
        base: "#c9b896",
        atmosphere: "#e8d5b5",
        rings: "#d4c4a5",
    }, // Saturn-like with rings
    Приливная: { base: "#cd853f", atmosphere: "#ff6347" }, // Tidal heated orange
};

export const PLANET_CLASS_MAP: Record<PlanetType, string> = {
    Пустынная: "planet-bg-пустынная",
    Ледяная: "planet-bg-ледяная",
    Лесная: "planet-bg-лесная",
    Вулканическая: "planet-bg-вулканическая",
    Океаническая: "planet-bg-океаническая",
    Радиоактивная: "planet-bg-радиоактивная",
    Тропическая: "planet-bg-тропическая",
    Арктическая: "planet-bg-арктическая",
    "Разрушенная войной": "planet-bg-разрушенная-войной",
    "Планета-кольцо": "planet-bg-планета-кольцо",
    Приливная: "planet-bg-приливная",
};

export const PLANET_SPECIALIZATIONS: Record<RaceId, PlanetSpecialization> = {
    human: {
        id: "human_academy",
        name: "Космическая Академия",
        description:
            "Военная академия людей предлагает обучение для членов экипажа. Интенсивная программа повышает боевую эффективность.",
        icon: "🎓",
        cost: 500,
        duration: 0, // Permanent
        cooldown: 999, // Once per planet
        requirements: {
            minLevel: 1,
            maxLevel: 3,
        },
        effects: [
            {
                type: "crew_level",
                value: 1,
                description: "+1 уровень выбранному члену экипажа",
            },
        ],
    },
    synthetic: {
        id: "synthetic_archives",
        name: "Архивы Данных",
        description:
            "Синтетики хранят знания древних цивилизаций. Можно получить ценную информацию о секторе.",
        icon: "📚",
        cost: 300,
        duration: 0, // Instant effect
        cooldown: 999,
        effects: [
            {
                type: "sector_scan",
                value: 1,
                description:
                    "Полное сканирование текущего сектора (все локации)",
            },
            {
                type: "artifact_hints",
                value: 3,
                description: "3 подсказки о местонахождении артефактов",
            },
        ],
    },
    xenosymbiont: {
        id: "xenosymbiont_lab",
        name: "Биолаборатория",
        description:
            "Ксилориане — мастера биотехнологий. Улучшите здоровье и регенерацию экипажа.",
        icon: "🧬",
        cost: 400,
        duration: 5,
        cooldown: 999,
        effects: [
            {
                type: "health_boost",
                value: 20,
                description:
                    "+20 к максимальному здоровью всему экипажу (постоянно)",
            },
            {
                type: "regen_boost",
                value: 5,
                description: "+5 к регенерации здоровья за ход",
            },
        ],
    },
    krylorian: {
        id: "krylorian_dojo",
        name: "Воинское Додзё",
        description:
            "Инсектоиды-крилориане — прирождённые воины. Обучение в додзё повышает боевые навыки.",
        icon: "⚔️",
        cost: 450,
        duration: 5,
        cooldown: 999,
        effects: [
            {
                type: "combat_bonus",
                value: 0.15,
                description: "+15% к урону в бою (постоянно для экипажа)",
            },
            {
                type: "evasion_bonus",
                value: 0.1,
                description: "+10% к уклонению от атак",
            },
        ],
    },
    voidborn: {
        id: "voidborn_ritual",
        name: "Мистический Ритуал",
        description:
            "Рождённые Пустотой проводят древние ритуалы для усиления артефактов и связи с космосом.",
        icon: "🔮",
        cost: 600,
        duration: 5,
        cooldown: 999,
        effects: [
            {
                type: "artifact_boost",
                value: 1,
                description:
                    "Усиление одного активного артефакта (+50% эффект)",
            },
            {
                type: "fuel_efficiency",
                value: 0.1,
                description: "+10% к эффективности топлива",
            },
        ],
    },
    crystalline: {
        id: "crystalline_resonator",
        name: "Кристальный Резонатор",
        description:
            "Кристаллические существа могут настроить энергосистемы корабля на резонанс с кристаллами.",
        icon: "💎",
        cost: 550,
        duration: 5,
        cooldown: 999,
        effects: [
            {
                type: "power_boost",
                value: 10,
                description: "+10 к максимальной энергии реактора",
            },
            {
                type: "shield_boost",
                value: 25,
                description: "+25 к максимальным щитам",
            },
        ],
    },
    aetherian: {
        id: "aetherian_observatory",
        name: "Астральная Обсерватория",
        description:
            "Эфирианцы настраивают сенсоры корабля на звёздные потоки, усиливая навигацию и научные системы.",
        icon: "✨",
        cost: 520,
        duration: 5,
        cooldown: 999,
        effects: [
            {
                type: "fuel_efficiency",
                value: 0.15,
                description: "+15% к эффективности топлива на 5 ходов",
            },
            {
                type: "evasion_bonus",
                value: 0.05,
                description: "+5% к уклонению на 5 ходов",
            },
        ],
    },

};
