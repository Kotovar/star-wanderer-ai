import type {
    CrewMemberAssignment,
    CrewMemberCombatAssignment,
    Profession,
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

export const PROFESSION_DESCRIPTIONS: Record<Profession, string> = {
    pilot: "Может улучшать маневрирование и навигацию.",
    engineer: "Может ремонтировать и улучшать системы корабля.",
    medic: "Может лечить экипаж и поддерживать мораль На корабле.",
    scout: "Может исследовать пустые планеты и находить ресурсы.",
    scientist: "Может исследовать аномалии. Может исследовать технолонии",
    gunner: "Управляет огнём корабля. Может выбирать цели в бою",
};

export const COMBAT_ACTIONS: Record<
    Profession,
    {
        value: NonNullable<CrewMemberCombatAssignment>;
        label: string;
        effect: string | null;
    }[]
> = {
    pilot: [
        { value: "", label: "ОЖИДАНИЕ", effect: null },
        {
            value: "evasion",
            label: "Маневры",
            effect: "+уровень% уклонение",
        },
    ],
    engineer: [
        { value: "", label: "ОЖИДАНИЕ", effect: null },
        { value: "repair", label: "Ремонт", effect: "+15% корпуса за ход" },
        {
            value: "calibration",
            label: "Калибровка",
            effect: "+10% точность",
        },
        {
            value: "overclock",
            label: "Перегрузка",
            effect: "+25% урон, -10% броня",
        },
    ],
    medic: [
        { value: "", label: "ОЖИДАНИЕ", effect: null },
        { value: "heal", label: "Лечение", effect: "+20 здоровье" },
        { value: "firstaid", label: "Медпаки", effect: "Защита при уроне" },
    ],
    scout: [
        { value: "", label: "ОЖИДАНИЕ", effect: null },
    ],
    scientist: [
        { value: "", label: "ОЖИДАНИЕ", effect: null },
    ],
    gunner: [
        { value: "", label: "ОЖИДАНИЕ", effect: null },
        {
            value: "targeting",
            label: "Прицеливание",
            effect: "Выбор цели",
        },
        {
            value: "rapidfire",
            label: "Скорострельность",
            effect: "+25% урон, -5% точность",
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
    ],
    medic: [
        { value: "", label: "ОЖИДАНИЕ", effect: null },
        { value: "heal", label: "Лечение", effect: "+20 здоровье" },
        { value: "morale", label: "Мораль", effect: "+15 настроение" },
        { value: "firstaid", label: "Медпаки", effect: "Защита при уроне" },
    ],
    scout: [
        { value: "", label: "ОЖИДАНИЕ", effect: null },
        { value: "patrol", label: "Патруль", effect: "+инфо о враге" },
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
            value: "maintenance",
            label: "Обслуживание",
            effect: "+5% точность",
        },
    ],
};

/**
 * Бонусы от назначения экипажа
 */
export const CREW_ASSIGNMENT_BONUSES = {
    REACTOR_OVERLOAD: 5,
    NAVIGATION_REDUCED_CONSUMPTION: -1,
    EVASION: 3, // 3% за уровень пилота
} as const;

/**
 * Бонусы от нахождения экипажа в модулях
 */
export const CREW_IN_MODULE_BONUSES = {
    ENGINEER_IN_REACTOR: 3,
} as const;
