import type { CrewMember } from "@/game/types";

export const getActiveAssignment = (crew: CrewMember, isCombat: boolean) =>
    isCombat ? crew.combatAssignment : crew.assignment;

/**
 * Civilian assignment effects for scientists
 */
export const RESEARCH_ASSIGNMENTS: Record<
    string,
    {
        name: string;
        description: string;
        researchBonus: number; // Bonus to research speed (multiplier)
    }
> = {
    analyzing: {
        name: "Анализ данных",
        description: "Обработка собранных данных с аномалий и артефактов",
        researchBonus: 1.0,
    },
    experimenting: {
        name: "Эксперименты",
        description: "Проведение экспериментов с образцами",
        researchBonus: 1.2,
    },
    theorizing: {
        name: "Теоретические изыскания",
        description: "Разработка теорий и математических моделей",
        researchBonus: 1.5,
    },
    // Other assignments (not scientist-specific)
    targeting: {
        name: "Прицеливание",
        description: "Бонус к точности оружия",
        researchBonus: 0,
    },
    power: {
        name: "Распределение энергии",
        description: "Бонус к энергии корабля",
        researchBonus: 0,
    },
    navigation: {
        name: "Навигация",
        description: "Снижение расхода топлива",
        researchBonus: 0,
    },
    firstaid: {
        name: "Первая помощь",
        description: "Лечение раненых",
        researchBonus: 0,
    },
    heal: {
        name: "Лечение",
        description: "Восстановление здоровья экипажа",
        researchBonus: 0,
    },
    repair: {
        name: "Ремонт",
        description: "Починка модулей корабля",
        researchBonus: 0,
    },
    morale: {
        name: "Поддержка морали",
        description: "Повышение настроения экипажа",
        researchBonus: 0,
    },
    evasion: {
        name: "Уклонение",
        description: "Бонус к уклонению корабля",
        researchBonus: 0,
    },
    overclock: {
        name: "Перегрузка",
        description: "Временный бонус к характеристикам",
        researchBonus: 0,
    },
    rapidfire: {
        name: "Быстрая стрельба",
        description: "Бонус к скорострельности",
        researchBonus: 0,
    },
    calibration: {
        name: "Калибровка",
        description: "Точная настройка систем",
        researchBonus: 0,
    },
    patrol: {
        name: "Патрулирование",
        description: "Охрана корабля",
        researchBonus: 0,
    },
    research: {
        name: "Исследования",
        description: "Научные изыскания",
        researchBonus: 1.0,
    },
};

/**
 * Combat assignment effects for scientists
 */
export const SCIENTIST_COMBAT_ASSIGNMENTS: Record<
    string,
    {
        name: string;
        description: string;
    }
> = {
    targeting: {
        name: "Тактический анализ",
        description: "Анализ слабых точек врага",
    },
    overclock: {
        name: "Перегрузка систем",
        description: "Временное усиление оружия",
    },
    rapidfire: {
        name: "Расчёт траекторий",
        description: "Оптимизация стрельбы",
    },
    maintenance: {
        name: "Боевой ремонт",
        description: "Экстренный ремонт систем",
    },
    calibration: {
        name: "Боевая калибровка",
        description: "Точная настройка прицелов",
    },
};
