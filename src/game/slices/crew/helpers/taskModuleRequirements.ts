import type { CrewMemberAssignment, ModuleType } from "@/game/types";
import { LAB_MODULE_TYPES } from "@/game/constants/modules";

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
    research: LAB_MODULE_TYPES,
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
    quarters: "жилом модуле",
    repair_bay: "ремонтном отсеке",
    weaponShed: "ячейка оружия",
    bio_research_lab: "биолаборатории",
    pulse_drive: "пульс-двигателе",
    habitat_module: "медицинском корпусе",
    deep_survey_array: "сканер-массиве",
};
