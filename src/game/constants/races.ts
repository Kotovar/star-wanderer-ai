import type { Race, RaceId } from "@/game/types";
import type { ModuleType } from "@/game/types";

/**
 * Эффекты сращивания ксеноморфа-симбионта с модулем корабля
 */
export interface XenosymbiontMergeEffect {
    /** ID модуля, с которым произошло сращивание */
    moduleId: number;
    /** Тип модуля */
    moduleType: ModuleType;
    /** Бонус к регенерации щитов (%) */
    shieldRegenBonus?: number;
    /** Бонус к ёмкости щита (%) */
    shieldCapacity?: number;
    /** Бонус к ремонту модулей (%) */
    repairBonus?: number;
    /** Снижение потребления энергии (%) */
    energyReduction?: number;
    /** Бонус к выработке энергии (%) */
    powerOutput?: number;
    /** Бонус к уклонению корабля (%) */
    evasionBonus?: number;
    /** Бонус к инициативе (%) */
    initiativeBonus?: number;
    /** Эффективность кислорода (%) */
    oxygenEfficiency?: number;
    /** Регенерация здоровья экипажа */
    crewHealthRegen?: number;
    /** Вместимость груза (%) */
    cargoCapacity?: number;
    /** Эффективность топлива (%) */
    fuelEfficiency?: number;
    /** Вместимость топлива (%) */
    fuelCapacity?: number;
    /** Дальность сканирования (%) */
    scanRange?: number;
    /** Скорость исследований (%) */
    researchSpeed?: number;
    /** Урон оружия (%) */
    weaponDamage?: number;
    /** Точность оружия (%) */
    weaponAccuracy?: number;
    /** Скорость лечения (%) */
    healing?: number;
    /** Скорость добычи (%) */
    miningSpeed?: number;
    /** Выход ресурсов (%) */
    resourceYield?: number;
    /** Сопротивление сбоям ИИ (%) */
    glitchResistance?: number;
}

export const RACES: Record<RaceId, Race> = {
    human: {
        id: "human",
        name: "Человек",
        pluralName: "Люди",
        adjective: "Человеческий",
        description:
            "Универсальная раса, освоившая космос. Быстро обучаются и адаптируются.",
        homeworld: "Земля",
        environmentPreference: {
            ideal: ["Лесная", "Океаническая", "Тропическая"],
            acceptable: ["Пустынная", "Арктическая", "Планета-кольцо"],
            hostile: [
                "Вулканическая",
                "Ледяная",
                "Радиоактивная",
                "Разрушенная войной",
                "Приливная",
            ],
        },
        crewBonuses: {
            happiness: 10, // +10% base happiness (morale boost)
            health: 5, // +5 health regen per turn when resting
        },
        specialTraits: [
            {
                id: "quick_learner",
                name: "Быстрый ученик",
                description: "+15% к получаемому опыту",
                type: "positive",
                effects: { expBonus: 0.15 },
            },
        ],
        relations: {
            synthetic: -10, // Some distrust of AI
            xenosymbiont: 5, // Friendly curiosity
        },
        hasHappiness: true,
        hasFatigue: true,
        canGetSick: true,
        color: "#4a90d9",
        icon: "👤",
    },

    synthetic: {
        id: "synthetic",
        name: "Синтетик",
        pluralName: "Синтетики",
        adjective: "Синтетический",
        description:
            "Искусственный разум, созданный древней цивилизацией или людьми. Не имеют эмоций, но обладают безупречной логикой.",
        homeworld: "Неизвестно",
        environmentPreference: {
            ideal: ["Вулканическая", "Радиоактивная"],
            acceptable: [
                "Пустынная",
                "Ледяная",
                "Арктическая",
                "Планета-кольцо",
                "Приливная",
            ],
            hostile: [
                "Лесная",
                "Океаническая",
                "Тропическая",
                "Разрушенная войной",
            ],
        },
        crewBonuses: {
            repair: 0.25, // +25% repair efficiency
            science: 0.25, // +25% research speed
        },
        specialTraits: [
            {
                id: "no_happiness",
                name: "Отсутствие эмоций",
                description:
                    "Не имеют счастья - иммунитет к моральным эффектам",
                type: "neutral",
                effects: { noHappiness: 1 },
            },
            {
                id: "ai_glitch",
                name: "Сбой ИИ",
                description: "Иногда принимают нелогичные решения",
                type: "negative",
                effects: { glitchChance: 0.05 },
            },
        ],
        relations: {
            human: -10,
            xenosymbiont: -20,
        },
        hasHappiness: false,
        hasFatigue: false,
        canGetSick: false,
        color: "#00d4ff",
        icon: "🤖",
    },

    xenosymbiont: {
        id: "xenosymbiont",
        name: "Ксеноморф-симбионт",
        pluralName: "Ксеноморфы-симбионты",
        adjective: "Симбионтский",
        description:
            'Полуорганические существа, живущие в симбиозе с технологиями. Могут "сращиваться" с кораблём.',
        homeworld: "Неизвестная планета в Тире 3",
        environmentPreference: {
            ideal: ["Океаническая", "Тропическая"],
            acceptable: ["Лесная", "Ледяная", "Планета-кольцо"],
            hostile: [
                "Пустынная",
                "Вулканическая",
                "Арктическая",
                "Радиоактивная",
                "Разрушенная войной",
                "Приливная",
            ],
        },
        crewBonuses: {
            energy: -0.25, // -25% energy consumption by modules
            health: 10, // +10 health (regenerative biology)
        },
        specialTraits: [
            {
                id: "symbiosis",
                name: "Техно-симбиоз",
                description:
                    "Могут сращиваться с кораблём, получая уникальные трейты",
                type: "positive",
                effects: { canMerge: 1 },
            },
            {
                id: "disturbing_presence",
                name: "Беспокоящее присутствие",
                description: "Снижают счастье органиков в экипаже на -5",
                type: "negative",
                effects: { alienPresencePenalty: -5 },
            },
        ],
        relations: {
            human: 5,
            synthetic: -20,
            crystalline: 15,
        },
        hasHappiness: true,
        hasFatigue: true,
        canGetSick: true,
        color: "#aa55ff",
        icon: "🦠",
    },

    krylorian: {
        id: "krylorian",
        name: "Крилорианец",
        pluralName: "Крилорианцы",
        adjective: "Крилорианский",
        description:
            "Воинственная рептилоидная раса с сильным чувством чести. Превосходные бойцы.",
        homeworld: "Крилор Прайм",
        environmentPreference: {
            ideal: ["Пустынная", "Тропическая", "Приливная"],
            acceptable: ["Вулканическая", "Лесная", "Разрушенная войной"],
            hostile: [
                "Ледяная",
                "Океаническая",
                "Арктическая",
                "Радиоактивная",
                "Планета-кольцо",
            ],
        },
        crewBonuses: {
            combat: 0.35,
            health: 15,
        },
        specialTraits: [
            {
                id: "intimidation",
                name: "Устрашение",
                description:
                    "Враги чаще промахиваются (-2% шанс попадания по кораблю)",
                type: "positive",
                effects: { evasionBonus: 0.02 },
            },
        ],
        relations: {
            human: 0,
            synthetic: -15,
            voidborn: 20,
        },
        hasHappiness: true,
        hasFatigue: true,
        canGetSick: true,
        color: "#ff6600",
        icon: "🦎",
    },

    voidborn: {
        id: "voidborn",
        name: "Порождённый Пустотой",
        pluralName: "Порождённые Пустотой",
        adjective: "Пустотный",
        description:
            "Существа, рождённые в глубинах космоса. Не нуждаются в атмосфере и комфорте.",
        homeworld: "Неизвестно",
        environmentPreference: {
            ideal: ["Планета-кольцо", "Приливная"],
            acceptable: [
                "Пустынная",
                "Ледяная",
                "Вулканическая",
                "Арктическая",
                "Разрушенная войной",
            ],
            hostile: ["Лесная", "Океаническая", "Тропическая", "Радиоактивная"],
        },
        crewBonuses: {
            fuelEfficiency: 0.2, // +20% fuel efficiency (increased)
            happiness: -10, // Lower base happiness (don't care)
        },
        specialTraits: [
            {
                id: "void_shield",
                name: "Пустотная защита",
                description:
                    "Щиты корабля восстанавливаются на 5% больше за ход",
                type: "positive",
                effects: { shieldRegen: 5 },
            },
            {
                id: "unnerving",
                name: "Беспокойство",
                description: "Их присутствие тревожит органиков на -10",
                type: "negative",
                effects: { alienPresencePenalty: -10 },
            },
            {
                id: "low_health",
                name: "Эфирное тело",
                description: "-20% к максимальному здоровью",
                type: "negative",
                effects: { healthPenalty: -0.2 },
            },
        ],
        relations: {
            human: -5,
            krylorian: 20,
            crystalline: 10,
        },
        hasHappiness: true,
        hasFatigue: false,
        canGetSick: false,
        color: "#9933ff",
        icon: "👁️",
    },

    crystalline: {
        id: "crystalline",
        name: "Кристаллоид",
        pluralName: "Кристаллоиды",
        adjective: "Кристаллический",
        description:
            "Разумные кристаллические существа. Медленно думают, но обладают огромной мудростью.",
        homeworld: "Геода Прайм",
        environmentPreference: {
            ideal: ["Ледяная", "Арктическая", "Планета-кольцо"],
            acceptable: ["Пустынная", "Приливная"],
            hostile: [
                "Лесная",
                "Океаническая",
                "Вулканическая",
                "Тропическая",
                "Радиоактивная",
                "Разрушенная войной",
            ],
        },
        crewBonuses: {
            science: 0.2, // +20% research speed (increased)
        },
        specialTraits: [
            {
                id: "crystal_armor",
                name: "Кристаллическая броня",
                description: "+5% к защите модулей корабля",
                type: "positive",
                effects: { moduleDefense: 0.05 },
            },
            {
                id: "resonance",
                name: "Кристаллический резонанс",
                description: "Может усиливать артефакты Древних на 15%",
                type: "positive",
                effects: { artifactBonus: 0.15 },
            },
            {
                id: "brittle_crystal",
                name: "Хрупкость",
                description: "-15% к максимальному здоровью",
                type: "negative",
                effects: { healthPenalty: -0.15 },
            },
        ],
        relations: {
            human: 10,
            synthetic: 5,
            xenosymbiont: 15,
            voidborn: 10,
        },
        hasHappiness: true,
        hasFatigue: true,
        canGetSick: false,
        color: "#00ffaa",
        icon: "💎",
    },
};

export const RACE_LAST_NAMES: Record<RaceId, readonly string[]> = {
    human: [
        // Русские и славянские
        "Смирнов",
        "Иванов",
        "Петров",
        "Соколов",
        "Лебедев",
        "Кузнецов",
        "Новак",
        "Ковальский",
        "Димитров",
        "Попеску",

        // Немецкие
        "Шмидт",
        "Мюллер",
        "Шнайдер",
        "Фишер",
        "Вебер",

        // Французские
        "Дюпон",
        "Лефевр",
        "Моро",
        "Жирар",
        "Блан",

        // Английские
        "Смит",
        "Джонсон",
        "Браун",
        "Тейлор",
        "Андерсон",

        // Испанские / Латиноамериканские
        "Гарсия",
        "Мартинес",
        "Родригес",
        "Лопес",
        "Эрнандес",

        // Итальянские
        "Россини",
        "Бьянки",
        "Романо",
        "Греко",
        "Феррари",

        // Скандинавские
        "Андерсен",
        "Нильсен",
        "Хансен",
        "Йоханссон",
        "Карлссон",

        // Ближний Восток
        "Хаддад",
        "Нассер",
        "Аль-Фарук",
        "Каримов",
        "Саиди",

        // Восточная Европа / Балканы
        "Йованович",
        "Стоянов",
        "Ковач",
        "Мазур",
        "Ткаченко",
    ],

    synthetic: [
        "АЛЬФА",
        "БЕТА",
        "ГАММА",
        "ДЕЛЬТА",
        "ОМЕГА",
        "СИГМА",
        "ТЕТА",
        "ЗЕТА",
        "XR-17",
        "MK-ULTRA",
        "CORE-Δ",
        "НЕЙРОН-5",
        "МОДУЛЬ-9",
        "АРХОН-3",
    ],

    xenosymbiont: [
        "Шшшииррр",
        "Ксссаррр",
        "Зззиттт",
        "Вввааассс",
        "Тттаннн",
        "Хххоррр",
        "Жжжууулл",
        "Ррраассх",
        "Кккзииит",
        "Шааа'ллл",
    ],

    krylorian: [
        "Кр'асс",
        "З'орк",
        "Т'арк",
        "В'рас",
        "Г'орм",
        "К'итор",
        "Д'раан",
        "С'келл",
        "М'зир",
        "В'торрак",
    ],

    voidborn: [
        "Эхо-7",
        "Тень-3",
        "Провал-12",
        "Бездна-5",
        "Мрак-9",
        "Сумрак-2",
        "Горизонт-0",
        "Пульсар-8",
        "Нуль-13",
        "Сингулярность-4",
    ],

    crystalline: [
        "Геода-Примус",
        "Кварц-Секундус",
        "Аметист-Терция",
        "Топаз-Кварта",
        "Обсидиан-Прайм",
        "Цитрин-Люкс",
        "Оникс-Нова",
        "Гранит-Максимус",
        "Базальт-Итера",
    ],
} as const;

// ═══════════════════════════════════════════════════════════════
// XENOSYMBIONT MERGE EFFECTS
// ═══════════════════════════════════════════════════════════════
export const XENOSYMBIONT_MERGE_EFFECTS: Record<
    ModuleType,
    {
        name: string;
        description: string;
        effects: Omit<XenosymbiontMergeEffect, "moduleId" | "moduleType">;
    }
> = {
    // ═══════════════════════════════════════════════════════════
    // ЭНЕРГЕТИКА И ИНФРАСТРУКТУРА
    // ═══════════════════════════════════════════════════════════
    reactor: {
        name: "Симбиоз с реактором",
        description:
            "Ксеноморф срастается с реактором, оптимизируя энергопотоки",
        effects: {
            powerOutput: 10,
        },
    },

    cockpit: {
        name: "Нейронная связь с мостиком",
        description:
            "Симбионт улучшает управление кораблём через нейронную связь",
        effects: {
            evasionBonus: 5,
        },
    },

    lifesupport: {
        name: "Био-усиление систем жизнеобеспечения",
        description:
            "Ксеноморф улучшает циркуляцию кислорода и питательных веществ",
        effects: {
            oxygenEfficiency: 20,
            crewHealthRegen: 2,
        },
    },

    // ═══════════════════════════════════════════════════════════
    // ОБОРУДОВАНИЕ И ХРАНЕНИЕ
    // ═══════════════════════════════════════════════════════════
    cargo: {
        name: "Органическая упаковка",
        description: "Груз оптимизирован биологическими структурами",
        effects: {
            cargoCapacity: 10,
        },
    },

    fueltank: {
        name: "Био-мембрана хранения",
        description: "Топливо хранится в органических резервуарах",
        effects: {
            fuelEfficiency: 15,
            fuelCapacity: 10,
        },
    },

    // ═══════════════════════════════════════════════════════════
    // НАУКА И РАЗВЕДКА
    // ═══════════════════════════════════════════════════════════
    scanner: {
        name: "Органическое сканирование",
        description: "Био-сенсоры расширяют диапазон сканирования",
        effects: {
            scanRange: 20,
        },
    },

    lab: {
        name: "Био-лаборатория",
        description: "Живые структуры ускоряют исследования",
        effects: {
            researchSpeed: 15,
        },
    },

    // ═══════════════════════════════════════════════════════════
    // БОЕВЫЕ СИСТЕМЫ
    // ═══════════════════════════════════════════════════════════
    weaponbay: {
        name: "Живое оружие",
        description: "Оружейные системы усилены био-усилителями",
        effects: {
            weaponDamage: 10,
            weaponAccuracy: 5,
        },
    },

    shield: {
        name: "Щитовой симбиоз",
        description: "Био-поле усиливает генератор щита",
        effects: {
            shieldRegenBonus: 15,
            shieldCapacity: 10,
        },
    },

    // ═══════════════════════════════════════════════════════════
    // МЕДИЦИНА И ПОДДЕРЖКА
    // ═══════════════════════════════════════════════════════════
    medical: {
        name: "Регенеративная камера",
        description: "Живые ткани увеличивают эффективность лечения",
        effects: {
            healing: 25,
        },
    },

    // ═══════════════════════════════════════════════════════════
    // ДВИЖЕНИЕ И ДОБЫЧА
    // ═══════════════════════════════════════════════════════════
    engine: {
        name: "Био-двигатель",
        description: "Органические компоненты улучшают тягу",
        effects: {
            fuelEfficiency: 10,
        },
    },

    drill: {
        name: "Живой бур",
        description: "Био-минеральные структуры улучшают добычу",
        effects: {
            resourceYield: 10,
        },
    },

    // ═══════════════════════════════════════════════════════════
    // ИСКУССТВЕННЫЙ ИНТЕЛЛЕКТ
    // ═══════════════════════════════════════════════════════════
    ai_core: {
        name: "Нейро-синтез",
        description: "Симбиоз органического и искусственного интеллекта",
        effects: {
            glitchResistance: 50,
        },
    },

    // weaponShed не поддерживает сращивание
    weaponShed: {
        name: "",
        description: "",
        effects: {},
    },
};
