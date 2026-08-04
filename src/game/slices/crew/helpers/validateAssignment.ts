import type {
    CrewMember,
    CrewMemberAssignment,
    CrewMemberCombatAssignment,
    Module,
} from "@/game/types";
import { COMBAT_ACTIONS, CREW_ACTIONS } from "@/game/constants/crew";
import { canMergeWithModule } from "./merge";
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
    task: NonNullable<CrewMemberAssignment | CrewMemberCombatAssignment>,
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
    task?: CrewMemberAssignment | CrewMemberCombatAssignment,
    mode: "civilian" | "combat" = "civilian",
): { valid: boolean; error?: string } => {
    // Если задача не указана, проверяем только профессию
    if (!task) {
        return { valid: true };
    }

    if (task === "merge" && mode === "civilian") {
        return canMergeWithModule(crewMember, currentModule)
            ? { valid: true }
            : {
                  valid: false,
                  error: 'Задача "merge" доступна только не сросшемуся ксеноморфу в подходящем модуле!',
              };
    }

    const availableTasks =
        mode === "combat"
            ? COMBAT_ACTIONS[crewMember.profession]
            : CREW_ACTIONS[crewMember.profession];
    if (!availableTasks.some((action) => action.value === task)) {
        return {
            valid: false,
            error: `Задача "${task}" недоступна для профессии ${crewMember.profession}!`,
        };
    }

    // Сначала проверяем валидность задачи для модуля
    const taskValidation = isValidTaskForModule(task, currentModule);
    if (!taskValidation.valid) {
        return taskValidation;
    }

    return { valid: true };
};
