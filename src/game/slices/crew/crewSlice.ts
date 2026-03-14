import type { GameStore } from "@/game/types/game";
import type { CrewMember, CrewMemberAssignment } from "@/game/types";
import { gainExp as gainExpHelper, isValidCrewAssignment } from "./helpers";
import {
    canMergeWithModule,
    canUnmerge,
    mergeWithModule as mergeWithModuleFn,
    unmergeFromModule as unmergeFromModuleFn,
    autoUnmergeOnMove as autoUnmergeOnMoveFn,
} from "./helpers/merge";
import { playSound } from "@/sounds";

/**
 * Интерфейс CrewSlice
 * Содержит методы для управления опытом и уровнем экипажа
 */
export interface CrewSlice {
    /**
     * Начисляет опыт члену экипажа с учётом всех бонусов
     */
    gainExp: (crewMember: CrewMember | undefined, amount: number) => void;

    /**
     * Проверка возможности сращивания с модулем
     */
    canMerge: (crewMember: CrewMember) => boolean;

    /**
     * Проверка возможности отсоединения от модуля
     */
    canUnmerge: (crewMember: CrewMember) => boolean;

    /**
     * Сращивает члена экипажа с модулем
     */
    mergeWithModule: (crewMemberId: number, moduleId: number) => boolean;

    /**
     * Отсоединяет члена экипажа от модуля
     */
    unmergeFromModule: (crewMemberId: number) => boolean;

    /**
     * Автоматически отсоединяет ксеноморфа при перемещении
     */
    autoUnmergeOnMove: (crewMemberId: number) => void;

    /**
     * Назначает гражданскую задачу члену экипажа
     */
    assignCrewTask: (
        crewId: number,
        task: CrewMemberAssignment | null,
        effect: string | null,
    ) => void;

    /**
     * Назначает боевую задачу члену экипажа
     */
    assignCombatTask: (
        crewId: number,
        task: string | null,
        effect: string | null,
    ) => void;

    /**
     * Находит всех членов экипажа в указанном модуле
     */
    getCrewInModule: (moduleId: number) => CrewMember[];

    /**
     * Перемещает члена экипажа в соседний модуль
     * @param crewId - ID члена экипажа
     * @param targetModuleId - ID целевого модуля
     */
    moveCrewMember: (crewId: number, targetModuleId: number) => void;
}

/**
 * Создаёт слайс экипажа с поддержкой immer
 *
 * @param set - Функция для обновления состояния
 * @param get - Функция для получения текущего состояния
 * @returns Объект с методами управления экипажем
 */
export const createCrewSlice = (
    set: (fn: (state: GameStore) => void) => void,
    get: () => GameStore,
): CrewSlice => ({
    gainExp: (crewMember, amount) => {
        const state = get();
        gainExpHelper(crewMember, amount, state, get(), set);
    },

    canMerge: (crewMember) => canMergeWithModule(crewMember),

    canUnmerge: (crewMember) => canUnmerge(crewMember),

    mergeWithModule: (crewMemberId, moduleId) =>
        mergeWithModuleFn(crewMemberId, moduleId, set, get),

    unmergeFromModule: (crewMemberId) =>
        unmergeFromModuleFn(crewMemberId, set, get),

    autoUnmergeOnMove: (crewMemberId) =>
        autoUnmergeOnMoveFn(crewMemberId, set, get),

    assignCrewTask: (crewId, task, effect) => {
        const state = get();
        const crewMember = state.crew.find((c) => c.id === crewId);
        if (!crewMember) return;

        // Check if crew member's assignment is valid based on their module position
        const currentModule = state.ship.modules.find(
            (m) => m.id === crewMember.moduleId,
        );
        if (!currentModule) return;

        // Validate assignment using helper function (pass task for task-specific validation)
        if (task) {
            const validation = isValidCrewAssignment(
                crewMember,
                currentModule,
                task,
            );
            if (!validation.valid) {
                get().addLog(
                    validation.error || "Неверное назначение!",
                    "error",
                );
                return;
            }
        }

        // Update civilian assignment (non-combat)
        set((s) => ({
            crew: s.crew.map((c) =>
                c.id === crewId
                    ? {
                          ...c,
                          assignment: task || null,
                          assignmentEffect: effect || null,
                          // Сброс сращивания при смене задания с "merge"
                          isMerged: task === "merge" ? c.isMerged : false,
                          mergedModuleId:
                              task === "merge" ? c.mergedModuleId : null,
                      }
                    : c,
            ),
        }));
    },

    assignCombatTask: (crewId, task, effect) => {
        const state = get();
        const crewMember = state.crew.find((c) => c.id === crewId);
        if (!crewMember) return;

        // Update combat assignment
        set((s) => ({
            crew: s.crew.map((c) =>
                c.id === crewId
                    ? {
                          ...c,
                          combatAssignment: task || null,
                          combatAssignmentEffect: effect || null,
                      }
                    : c,
            ),
        }));
    },

    getCrewInModule: (moduleId) => {
        return get().crew.filter((c) => c.moduleId === moduleId);
    },

    moveCrewMember: (crewId, targetModuleId) => {
        const state = get();
        const crewMember = state.crew.find((c) => c.id === crewId);
        if (!crewMember) return;

        // Check if crew member already moved this turn
        if (crewMember.movedThisTurn) {
            get().addLog(
                `${crewMember.name} уже перемещался в этот ход!`,
                "error",
            );
            return;
        }

        // Check if target module exists
        const targetModule = state.ship.modules.find(
            (m) => m.id === targetModuleId,
        );
        if (!targetModule) {
            get().addLog("Модуль не найден!", "error");
            return;
        }

        // Check if target module is disabled (manually turned off, not destroyed)
        if (targetModule.manualDisabled) {
            get().addLog("Нельзя переместиться в отключённый модуль!", "error");
            return;
        }

        // Check if target module is adjacent to current module
        if (!get().isModuleAdjacent(crewMember.moduleId, targetModuleId)) {
            get().addLog(
                "Модуль не соседний! Можно переместиться только в соседний модуль.",
                "error",
            );
            return;
        }

        // Move crew member
        set((s) => ({
            crew: s.crew.map((c) =>
                c.id === crewId
                    ? {
                          ...c,
                          moduleId: targetModuleId,
                          movedThisTurn: true,
                          assignment: null,
                          assignmentEffect: null,
                          // Сброс сращивания при перемещении
                          isMerged: false,
                          mergedModuleId: null,
                      }
                    : c,
            ),
        }));

        get().addLog(
            `${crewMember.name} переместился в "${targetModule.name}"`,
            "info",
        );
        playSound("click");
    },
});
