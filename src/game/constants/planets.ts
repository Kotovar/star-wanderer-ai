import type {
    PlanetPointOfInterest,
    PlanetSpecialization,
    PlanetType,
    RaceId,
} from "../types";

export const PLANET_TYPES: PlanetType[] = [
    "Пустынная",
    "Ледяная",
    "Лесная",
    "Вулканическая",
    "Океаническая",
    "Кристаллическая",
    "Радиоактивная",
    "Тропическая",
    "Арктическая",
    "Разрушенная войной",
    "Планета-кольцо",
    "Приливная",
];

export const PLANET_POINT_OF_INTERESTS: Record<
    PlanetType,
    PlanetPointOfInterest
> = {
    Пустынная: "resource_vein",
    Ледяная: "crash_site",
    Лесная: "alien_biosphere",
    Вулканическая: "resource_vein",
    Океаническая: "alien_biosphere",
    Кристаллическая: "ancient_ruins",
    Радиоактивная: "crash_site",
    Тропическая: "alien_biosphere",
    Арктическая: "crash_site",
    "Разрушенная войной": "ancient_ruins",
    "Планета-кольцо": "resource_vein",
    Приливная: "research_site",
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
    Кристаллическая: { base: "#7568ff", atmosphere: "#b7f8ff" }, // Crystal violet with cyan glow
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
    Кристаллическая: "planet-bg-кристаллическая",
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
        cooldown: 0, // Unlimited uses
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
            "Синтетики хранят знания древних цивилизаций. Архивы сканируют сектор и отмечают сигналы трёх артефактов.",
        icon: "📚",
        cost: 400,
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
                description: "3 сигнала артефактов сохраняются в панели артефактов",
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
        duration: 15,
        cooldown: 999,
        effects: [
            {
                type: "health_boost",
                value: 5,
                description:
                    "+5 к максимальному здоровью всему экипажу (постоянно)",
            },
            {
                type: "health_regen",
                value: 15,
                description: "+15 к регенерации здоровья за ход",
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
        duration: 15,
        cooldown: 999,
        effects: [
            {
                type: "combat_bonus",
                value: 0.1,
                description: "+10% к урону в бою (постоянно для экипажа)",
            },
            {
                type: "evasion_bonus",
                value: 0.1,
                description: "+10% к уклонению от атак ",
            },
        ],
    },
    voidborn: {
        id: "voidborn_ritual",
        name: "Мистический Ритуал",
        description:
            "Рождённые Пустотой проводят древние ритуалы: дают +50% к эффективности топлива и, по желанию, усиливают один активный артефакт.",
        icon: "🔮",
        cost: 600,
        duration: 15,
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
                value: 0.5,
                description: "+50% к эффективности топлива ",
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
        duration: 15,
        cooldown: 999,
        effects: [
            {
                type: "power_boost",
                value: 10,
                description: "+10 к максимальной энергии реактора ",
            },
            {
                type: "shield_boost",
                value: 25,
                description: "+25 к максимальным щитам ",
            },
        ],
    },
};
