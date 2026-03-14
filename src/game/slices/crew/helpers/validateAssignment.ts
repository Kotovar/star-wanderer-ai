import type {
    CrewMember,
    CrewMemberAssignment,
    Module,
    ModuleType,
    Profession,
} from "@/game/types";
import {
    TASK_MODULE_REQUIREMENTS,
    MODULE_TYPE_NAMES,
} from "./taskModuleRequirements";

/**
 * Проверка валидности назначения для задачи
 *
 * @param task - Название задачи
 * @param currentModule - Текущий модуль
 * @returns Результат валидации
 */
const isValidTaskForModule = (
    task: NonNullable<CrewMemberAssignment>,
    currentModule: Module,
): { valid: boolean; error?: string } => {
    const requiredModules = TASK_MODULE_REQUIREMENTS[task] || [];

    if (
        requiredModules.length > 0 &&
        !requiredModules.includes(currentModule.type)
    ) {
        const moduleNames = requiredModules
            .map((type) => MODULE_TYPE_NAMES[type] || type)
            .join(" или ");

        return {
            valid: false,
            error: `Задача "${task}" доступна только в ${moduleNames}!`,
        };
    }

    return { valid: true };
};

/**
 * Проверка валидности назначения для профессии
 *
 * @param crewMember - Член экипажа
 * @param currentModule - Текущий модуль
 * @returns true если назначение валидно
 */
export const isValidCrewAssignment = (
    crewMember: CrewMember,
    currentModule: Module,
    task?: CrewMemberAssignment,
): { valid: boolean; error?: string } => {
    // Если задача не указана, проверяем только профессию
    if (!task) {
        return { valid: true };
    }

    // Сначала проверяем валидность задачи для модуля
    const taskValidation = isValidTaskForModule(task, currentModule);
    if (!taskValidation.valid) {
        return taskValidation;
    }

    // Затем проверяем профессию (для общих ограничений)
    const professionModuleRequirements: Record<Profession, ModuleType[]> = {
        pilot: ["cockpit"], // Pilot assignments only work in cockpit
        engineer: [], // Engineer can work in any module
        medic: [], // Medic can work in any module
        scout: [], // Scout can work anywhere
        scientist: [], // Scientist can work anywhere
        gunner: [], // Gunner can work anywhere
    };

    const requiredModules =
        professionModuleRequirements[crewMember.profession] || [];

    if (
        requiredModules.length > 0 &&
        !requiredModules.includes(currentModule.type)
    ) {
        const professionName =
            crewMember.profession === "pilot" ? "Пилот" : crewMember.profession;
        const moduleNames = requiredModules
            .map((type) => {
                const names: Record<string, string> = {
                    cockpit: "кокпите",
                };
                return names[type] || type;
            })
            .join(" или ");

        return {
            valid: false,
            error: `${professionName} должен быть в ${moduleNames} для этого задания!`,
        };
    }

    return { valid: true };
};
