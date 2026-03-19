import type { CrewMemberAssignment, ModuleType } from "@/game/types";

/**
 * Требования к модулям для конкретных задач
 * Определяет, в каких модулях может выполняться каждая задача
 */
export const TASK_MODULE_REQUIREMENTS: Record<
    NonNullable<CrewMemberAssignment>,
    ModuleType[]
> = {
    // Пилот
    evasion: ["cockpit"],
    navigation: ["cockpit"],

    // Инженер
    reactor_overload: ["reactor"],
    repair: [],
    calibration: ["weaponbay"],
    overclock: ["weaponbay"],

    // Медик
    heal: [],
    morale: [],
    firstaid: [],

    // Разведчик
    patrol: [],
    sabotage: [],

    // Учёный
    research: ["lab"],
    analyzing: [],
    analysis: [],

    // Стрелок
    targeting: ["weaponbay"],
    rapidfire: ["weaponbay"],
    training: ["weaponbay"],

    // Ксеноморфы
    merge: [],

    // Без задач
    "": [],
};

/**
 * Названия модулей для отображения в сообщениях об ошибках
 */
export const MODULE_TYPE_NAMES: Record<ModuleType, string> = {
    cockpit: "кокпите",
    reactor: "реакторе",
    weaponbay: "оружейной палубе",
    lab: "лаборатории",
    cargo: "грузовом отсеке",
    fueltank: "топливном баке",
    scanner: "сканере",
    drill: "буре",
    shield: "генераторе щита",
    engine: "двигателе",
    lifesupport: "системах жизнеобеспечения",
    medical: "медотсеке",
    ai_core: "ИИ ядре",
    weaponShed: "ячейка оружия",
};
