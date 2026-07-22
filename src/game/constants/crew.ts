import type {
    CrewMemberAssignment,
    CrewMemberCombatAssignment,
    Profession,
    ModuleType,
} from "@/game/types";

// Base prices for crew by profession
export const CREW_BASE_PRICES: Record<Profession, number> = {
    pilot: 400,
    engineer: 450,
    medic: 500,
    scout: 550,
    scientist: 600,
    gunner: 500,
};

export const PROFESSION_NAMES: Record<Profession, string> = {
    pilot: "Пилот",
    engineer: "Инженер",
    medic: "Медик",
    scout: "Разведчик",
    scientist: "Учёный",
    gunner: "Стрелок",
};

type ActiveCrewAssignment = Exclude<NonNullable<CrewMemberAssignment>, "">;

export const CREW_ASSIGNMENT_ICONS: Record<ActiveCrewAssignment, string> = {
    targeting: "🎯",
    navigation: "🧭",
    firstaid: "🩹",
    heal: "💉",
    repair: "🔧",
    morale: "😊",
    evasion: "🌀",
    overclock: "⚡",
    rapidfire: "🔥",
    calibration: "⚙",
    patrol: "🔭",
    research: "🔬",
    analyzing: "🔎",
    reactor_overload: "⚛",
    analysis: "🧠",
    sabotage: "🕵",
    merge: "🧬",
    training: "🎓",
    fuel_synthesis: "⛽",
    vent_fuel: "♨️",
};

export const COMBAT_ACTIONS: Record<
    Profession,
    {
        value: NonNullable<CrewMemberCombatAssignment>;
        label: string;
        effect: string | null;
        moduleType?: ModuleType; // Требуемый тип модуля
    }[]
> = {
    pilot: [
        { value: "", label: "ОЖИДАНИЕ", effect: null },
        {
            value: "evasion",
            label: "Маневры",
            effect: "+уровень% уклонение",
            moduleType: "cockpit",
        },
        {
            value: "vent_fuel",
            label: "Вентиляция топлива",
            effect: "-10 топлива, +15 щита",
            moduleType: "fueltank",
        },
    ],
    engineer: [
        { value: "", label: "ОЖИДАНИЕ", effect: null },
        { value: "repair", label: "Ремонт", effect: "+15% корпуса за ход" },
        {
            value: "calibration",
            label: "Калибровка",
            effect: "+10% точность",
            moduleType: "weaponbay",
        },
        {
            value: "overclock",
            label: "Перегрузка",
            effect: "+15% урон, -броня модуля",
            moduleType: "weaponbay",
        },
        {
            value: "vent_fuel",
            label: "Вентиляция топлива",
            effect: "-10 топлива, +15 щита",
            moduleType: "fueltank",
        },
    ],
    medic: [
        { value: "", label: "ОЖИДАНИЕ", effect: null },
        { value: "heal", label: "Лечение", effect: "+20 здоровье" },
        {
            value: "firstaid",
            label: "Медпаки",
            effect: "Защита при уроне",
        },
    ],
    scout: [
        { value: "", label: "ОЖИДАНИЕ", effect: null },
        {
            value: "sabotage",
            label: "Диверсии",
            effect: "-5% шанс попадания врага",
        },
    ],
    scientist: [
        { value: "", label: "ОЖИДАНИЕ", effect: null },
        {
            value: "analysis",
            label: "Анализ уязвимостей",
            effect: "+10% урон по цели",
        },
    ],
    gunner: [
        { value: "", label: "ОЖИДАНИЕ", effect: null },
        {
            value: "targeting",
            label: "Прицеливание",
            effect: "Выбор цели",
            moduleType: "weaponbay",
        },
        {
            value: "rapidfire",
            label: "Скорострельность",
            effect: "+25% урон, -5% точность",
            moduleType: "weaponbay",
        },
    ],
};

export const CREW_ACTIONS: Record<
    Profession,
    {
        value: NonNullable<CrewMemberAssignment>;
        label: string;
        effect: string | null;
    }[]
> = {
    pilot: [
        { value: "", label: "ОЖИДАНИЕ", effect: null },
        { value: "navigation", label: "Навигация", effect: "+1⚡ потребление" },
    ],
    engineer: [
        { value: "", label: "ОЖИДАНИЕ", effect: null },
        { value: "repair", label: "Ремонт", effect: "+15% броня за ход" },
        {
            value: "reactor_overload",
            label: "Разгон реактора",
            effect: "+5⚡ энергии реактору",
        },
        {
            value: "fuel_synthesis",
            label: "Синтез топлива",
            effect: "+1 топливо, -2 морали за ход",
        },
    ],
    medic: [
        { value: "", label: "ОЖИДАНИЕ", effect: null },
        { value: "heal", label: "Лечение", effect: "+20 здоровье" },
        { value: "morale", label: "Мораль", effect: "+15 настроение" },
    ],
    scout: [
        { value: "", label: "ОЖИДАНИЕ", effect: null },
        { value: "patrol", label: "Патруль", effect: "+шанс найти кредиты" },
    ],
    scientist: [
        { value: "", label: "ОЖИДАНИЕ", effect: null },
        {
            value: "research",
            label: "Исследование",
            effect: "+100% к науке",
        },
        {
            value: "analyzing",
            label: "Анализ аномалий",
            effect: "+данные с аномалий",
        },
    ],
    gunner: [
        { value: "", label: "ОЖИДАНИЕ", effect: null },
        {
            value: "training",
            label: "Тренировка",
            effect: "+1 опыт за ход",
        },
    ],
};

/**
 * Бонусы от назначения экипажа
 */
export const CREW_ASSIGNMENT_BONUSES = {
    REACTOR_OVERLOAD: 5,
    NAVIGATION_REDUCED_CONSUMPTION: -1,
    EVASION: 2, // 2% за уровень пилота (кап 30% достигается при ур.10 + задание уклонения)
    // Combat assignment damage bonuses (multipliers)
    OVERCLOCK_DAMAGE: 0.15, // +15% damage
    RAPIDFIRE_DAMAGE: 0.25, // +25% damage
    ANALYSIS_DAMAGE: 0.1, // +10% damage to selected module
} as const;

export const DEFAULT_MAX_HEALTH = 100;
export const MIN_CREW_HEALTH = 0;
export const MIN_HEALTH_WITH_IMMORTALITY = 1;

/**
 * Базовое здоровье экипажа за уровень
 */
export const BASE_CREW_HEALTH_PER_LEVEL = 20;

/**
 * Базовое здоровье экипажа первого уровня
 */
export const BASE_CREW_HEALTH = 100;

/**
 * Базовое счастье экипажа при найме (в процентах от максимального)
 */
export const INITIAL_HAPPINESS_PERCENT = 80;

/**
 * Максимальное счастье экипажа по умолчанию
 */
export const DEFAULT_MAX_HAPPINESS = 100;

/**
 * Базовый бонус учёного за ход
 */
export const SCIENTIST_BASE_BONUS = 3;

/**
 * Множитель бонуса за назначение на исследование (100% = 2x)
 */
export const RESEARCH_ASSIGNMENT_MULTIPLIER = 2;
