import type { CrewTraitType, Profession } from "../types";

// Extended crew traits with different rarities

type TraitDetails = {
    name: string;
    desc: string;
    effect: Record<string, number>;
    rarity: string;
    priceMod: number;
};

// Base prices for crew by profession
export const CREW_BASE_PRICES: Record<Profession, number> = {
    pilot: 400,
    engineer: 450,
    medic: 500,
    scout: 550,
    scientist: 600,
    gunner: 500,
};

export const CREW_TRAITS: Record<
    Exclude<CrewTraitType, "neutral">,
    TraitDetails[]
> = {
    positive: [
        // Common positive traits (60% chance)
        {
            name: "Меткий стрелок",
            desc: "+10% к урону",
            effect: { damageBonus: 0.1 },
            rarity: "common",
            priceMod: 1.1,
        },
        {
            name: "Опытный",
            desc: "+15% эффективность",
            effect: { taskBonus: 0.15 },
            rarity: "common",
            priceMod: 1.15,
        },
        {
            name: "Харизматичный",
            desc: "+10 настроение команды в модуле",
            effect: { moduleMorale: 10 },
            rarity: "common",
            priceMod: 1.1,
        },
        {
            name: "Выносливый",
            desc: "+20% здоровье",
            effect: { healthBonus: 0.2 },
            rarity: "common",
            priceMod: 1.15,
        },
        {
            name: "Трудолюбивый",
            desc: "+10% к опыту",
            effect: { expBonus: 0.1 },
            rarity: "common",
            priceMod: 1.1,
        },

        // Rare positive traits (30% chance)
        {
            name: "Ветеран",
            desc: "+25% к урону, +15% защита",
            effect: { damageBonus: 0.25, defenseBonus: 0.15 },
            rarity: "rare",
            priceMod: 1.4,
        },
        {
            name: "Гений",
            desc: "+30% эффективность, +20% опыт",
            effect: { taskBonus: 0.3, expBonus: 0.2 },
            rarity: "rare",
            priceMod: 1.5,
        },
        {
            name: "Лидер",
            desc: "+20 настроение команды, +10% эффективность",
            effect: { moduleMorale: 20, taskBonus: 0.1 },
            rarity: "rare",
            priceMod: 1.4,
        },
        {
            name: "Удачливый",
            desc: "+5% ко всем наградам",
            effect: { lootBonus: 0.05 },
            rarity: "rare",
            priceMod: 1.45,
        },
        {
            name: "Непобедимый",
            desc: "+40% здоровье, +10% регенерация",
            effect: { healthBonus: 0.4, regenBonus: 0.1 },
            rarity: "rare",
            priceMod: 1.5,
        },

        // Legendary positive traits (10% chance)
        {
            name: "Легенда",
            desc: "+50% к макс. здоровью и морали",
            effect: { healthBonus: 0.5, maxHappinessBonus: 50 },
            rarity: "legendary",
            priceMod: 2.5,
        },
        {
            name: "Мастер",
            desc: "Двойной эффект от заданий",
            effect: { doubleTaskEffect: 1 },
            rarity: "legendary",
            priceMod: 2.8,
        },
    ],
    negative: [
        // Common negative traits (50% chance)
        {
            name: "Трус",
            desc: "-10 морали в бою каждый ход",
            effect: { combatMoraleDrain: 10 },
            rarity: "common",
            priceMod: 0.9,
        },
        {
            name: "Неряха",
            desc: "-5 настроение других",
            effect: { teamMorale: -5 },
            rarity: "common",
            priceMod: 0.9,
        },
        {
            name: "Болезненный",
            desc: "-15% здоровье",
            effect: { healthPenalty: 0.15 },
            rarity: "common",
            priceMod: 0.85,
        },

        // Rare negative traits (30% chance)
        {
            name: "Жадный",
            desc: "-1₢ за продажу за каждого юнита",
            effect: { sellPricePenalty: 1 },
            rarity: "rare",
            priceMod: 0.7,
        },
        {
            name: "Пессимист",
            desc: "-20 морали в первый ход боя модулю",
            effect: { combatStartMoraleDrain: 20 },
            rarity: "rare",
            priceMod: 0.65,
        },
        {
            name: "Хрупкий",
            desc: "-30% здоровье",
            effect: { healthPenalty: 0.3 },
            rarity: "rare",
            priceMod: 0.6,
        },
        {
            name: "Бунтарь",
            desc: "-15 настроение, риск дезертирства",
            effect: { moralePenalty: 15, desertionRisk: 0.1 },
            rarity: "rare",
            priceMod: 0.55,
        },
    ],
    // Mutation traits - from Ancient Biosphere curse
    mutation: [
        {
            name: "Мутация: Щупальца",
            desc: "+20% урон",
            effect: { damageBonus: 0.2 },
            rarity: "mutation",
            priceMod: 1.0,
        },
        {
            name: "Мутация: Третий глаз",
            desc: "+15% крит, -10 счастья/ход",
            effect: { critBonus: 0.15, happinessDrain: 10 },
            rarity: "mutation",
            priceMod: 1.0,
        },
        {
            name: "Мутация: Хитин",
            desc: "+25% защита, -20% эффективность",
            effect: { defenseBonus: 0.25, taskPenalty: 0.2 },
            rarity: "mutation",
            priceMod: 1.0,
        },
        {
            name: "Мутация: Телепатия",
            desc: "Видит намерения, -15 мораль команды",
            effect: { ambushAvoid: 0.5, teamMorale: -15 },
            rarity: "mutation",
            priceMod: 1.0,
        },
        {
            name: "Мутация: Регенерация",
            desc: "+5 здоровье/ход, -25% макс. здоровье",
            effect: { regenBonus: 0.5, healthPenalty: 0.25 },
            rarity: "mutation",
            priceMod: 1.0,
        },
        {
            name: "Мутация: Фотосинтез",
            desc: "Не ест, но нужен свет",
            effect: { foodFree: 1, needsLight: 1 },
            rarity: "mutation",
            priceMod: 1.0,
        },
    ],
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
    pilot: "Может улучшать маневрирование и навигацию. Управляет щитами.",
    engineer: "Может ремонтировать и улучшать системы корабля.",
    medic: "Может лечить экипаж и поддерживать мораль в модуле.",
    scout: "Может исследовать пустые планеты и находить ресурсы.",
    scientist:
        "Может исследовать аномалии. Уровень определяет сложность аномалий.",
    gunner: "Управляет огнём корабля. Может выбирать цели в бою, +15% урон.",
};

export const CREW_ACTIONS: Record<
    Profession,
    { value: string; label: string; effect: string | null }[]
> = {
    pilot: [
        { value: "", label: "ОЖИДАНИЕ", effect: null },
        { value: "evasion", label: "Маневры", effect: "+15 щитов за ход" },
        { value: "navigation", label: "Навигация", effect: "-1⚡ потребление" },
    ],
    engineer: [
        { value: "", label: "ОЖИДАНИЕ", effect: null },
        { value: "power", label: "Разгон", effect: "+5⚡ генерация" },
        { value: "repair", label: "Ремонт", effect: "+15% броня за ход" },
        {
            value: "overclock",
            label: "Перегрузка",
            effect: "+25% урон,-10% броня",
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
            effect: "+данные аномалий",
        },
    ],
    gunner: [
        { value: "", label: "ОЖИДАНИЕ", effect: null },
        {
            value: "targeting",
            label: "Прицеливание",
            effect: "Выбор цели,+15% урон",
        },
        {
            value: "rapidfire",
            label: "Скорострельность",
            effect: "+25% урон,-5% точность",
        },
    ],
};
