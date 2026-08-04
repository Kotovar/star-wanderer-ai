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
    interception: "🛡️",
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
    clean_weapons: "🧹",
};

export const COMBAT_ACTIONS: Record<
    Profession,
    {
        value: NonNullable<CrewMemberCombatAssignment>;
        moduleType?: ModuleType; // Требуемый тип модуля
    }[]
> = {
    pilot: [
        { value: "" },
        { value: "evasion", moduleType: "cockpit" },
        { value: "vent_fuel", moduleType: "fueltank" },
    ],
    engineer: [
        { value: "" },
        { value: "repair" },
        { value: "calibration", moduleType: "weaponbay" },
        { value: "overclock", moduleType: "weaponbay" },
        { value: "vent_fuel", moduleType: "fueltank" },
    ],
    medic: [{ value: "" }, { value: "heal" }, { value: "firstaid" }],
    scout: [{ value: "" }, { value: "sabotage" }],
    scientist: [{ value: "" }, { value: "analysis" }],
    gunner: [
        { value: "" },
        { value: "targeting", moduleType: "weaponbay" },
        { value: "rapidfire", moduleType: "weaponbay" },
        { value: "interception", moduleType: "point_defense" },
    ],
};

export const CREW_ACTIONS: Record<
    Profession,
    { value: NonNullable<CrewMemberAssignment> }[]
> = {
    pilot: [{ value: "" }, { value: "navigation" }],
    engineer: [
        { value: "" },
        { value: "repair" },
        { value: "reactor_overload" },
        { value: "fuel_synthesis" },
    ],
    medic: [{ value: "" }, { value: "heal" }, { value: "morale" }],
    scout: [{ value: "" }, { value: "patrol" }],
    scientist: [{ value: "" }, { value: "research" }, { value: "analyzing" }],
    gunner: [{ value: "" }, { value: "training" }, { value: "clean_weapons" }],
};

/**
 * Подпись и эффект задачи живут в локалях, а не в этой таблице — иначе
 * английская сборка показывала русский текст. Пустое значение — «ожидание».
 */
export const getCrewActionLabelKey = (value: string) =>
    `crew_actions.${value || "waiting"}`;

export const getCrewActionEffectKey = (value: string) =>
    `crew_actions.${value || "waiting"}_effect`;

/**
 * Сращивание — задача только для ксеноморфов, поэтому её нет в CREW_ACTIONS
 * по профессиям. Подпись общая для меню задач и карточки экипажа.
 */
export const XENOSYMBIONT_MERGE_ACTION = { value: "merge" } as const;

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
