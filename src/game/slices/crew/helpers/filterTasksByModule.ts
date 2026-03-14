import type { CrewMemberAssignment, Module } from "@/game/types";
import { TASK_MODULE_REQUIREMENTS } from "./taskModuleRequirements";

/**
 * Фильтрует доступные задачи для члена экипажа на основе его модуля
 *
 * @param crewMember - Член экипажа
 * @param currentModule - Текущий модуль
 * @param allTasks - Все доступные задачи для профессии
 * @returns Отфильтрованный список задач
 */
export const getAvailableTasksForModule = <
    T extends { value: NonNullable<CrewMemberAssignment> },
>(
    currentModule: Module | undefined,
    allTasks: T[],
): T[] => {
    if (!currentModule) return allTasks;

    return allTasks.filter((task) => {
        const requiredModules = TASK_MODULE_REQUIREMENTS[task.value] || [];

        // Если задач нет в списке требований, она доступна везде
        if (requiredModules.length === 0) return true;

        // Проверяем, соответствует ли модуль требованиям
        return requiredModules.includes(currentModule.type);
    });
};
