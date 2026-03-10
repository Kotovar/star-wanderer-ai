import type { GameStore } from "@/game/types/game";
import type { CrewMember } from "@/game/types";
import { gainExp as gainExpHelper } from "./helpers";
import {
    canMergeWithModule,
    canUnmerge,
    mergeWithModule as mergeWithModuleFn,
    unmergeFromModule as unmergeFromModuleFn,
    autoUnmergeOnMove as autoUnmergeOnMoveFn,
} from "./helpers/merge";

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
});
