import { RACES, XENOSYMBIONT_MERGE_EFFECTS } from "@/game/constants/races";
import type { GameState, GameStore, CrewMember } from "@/game/types";
import { getCargoCapacity } from "@/game/slices/ship/helpers/getCargoCapacity";

/**
 * Проверяет, может ли член экипажа срастись с модулем
 */
export const canMergeWithModule = (crewMember: CrewMember): boolean => {
    if (crewMember.isMerged) return false;

    const race = RACES[crewMember.race];
    return race.id === "xenosymbiont";
};

/**
 * Проверяет, может ли член экипажа отсоединиться от модуля
 */
export const canUnmerge = (crewMember: CrewMember): boolean => {
    return crewMember.isMerged && crewMember.mergedModuleId !== null;
};

/**
 * Сращивает члена экипажа с модулем
 * @returns true если сращивание успешно
 */
export const mergeWithModule = (
    crewMemberId: number,
    moduleId: number,
    set: (fn: (s: GameState) => void) => void,
    get: () => GameStore,
): boolean => {
    const crew = get().crew;
    const crewMember = crew.find((c) => c.id === crewMemberId);

    if (!crewMember || !canMergeWithModule(crewMember)) {
        return false;
    }

    const moduleShip = get().ship.modules.find((m) => m.id === moduleId);
    if (!moduleShip || moduleShip.type === "weaponShed") {
        return false;
    }

    // Проверяем, нет ли уже другого ксеноморфа в этом модуле
    const existingMerge = crew.find(
        (c) => c.isMerged && c.mergedModuleId === moduleId,
    );
    if (existingMerge) {
        get().addLog(
            `⚠️ Модуль "${moduleShip.name}" уже занят другим ксеноморфом`,
            "warning",
        );
        return false;
    }

    set((s) => ({
        crew: s.crew.map((c) =>
            c.id === crewMemberId
                ? {
                      ...c,
                      isMerged: true,
                      mergedModuleId: moduleId,
                  }
                : c,
        ),
    }));

    const mergeEffect = XENOSYMBIONT_MERGE_EFFECTS[moduleShip.type];
    get().addLog(
        `🧬 ${crewMember.name} срастился с "${moduleShip.name}" (${mergeEffect.name})`,
        "info",
    );

    return true;
};

/**
 * Отсоединяет члена экипажа от модуля
 * @returns true если отсоединение успешно
 */
export const unmergeFromModule = (
    crewMemberId: number,
    set: (fn: (s: GameState) => void) => void,
    get: () => GameStore,
): boolean => {
    const crew = get().crew;
    const crewMember = crew.find((c) => c.id === crewMemberId);

    if (!crewMember || !canUnmerge(crewMember)) {
        return false;
    }

    const moduleShip = get().ship.modules.find(
        (m) => m.id === crewMember.mergedModuleId,
    );

    // Предупредить если груз переполнится после отмены сращивания
    if (moduleShip?.type === "cargo") {
        const state = get();
        const currentCargo =
            state.ship.cargo.reduce((s, c) => s + c.quantity, 0) +
            state.ship.tradeGoods.reduce((s, g) => s + g.quantity, 0);
        const capacityAfter = getCargoCapacity({
            ...state,
            crew: state.crew.map((c) =>
                c.id === crewMemberId ? { ...c, isMerged: false, mergedModuleId: null } : c,
            ),
        });
        if (currentCargo > capacityAfter) {
            get().addLog(
                `⚠️ Груз (${currentCargo}т) превышает вместимость после отмены сращивания (${capacityAfter}т). Продайте излишки!`,
                "warning",
            );
        }
    }

    set((s) => ({
        crew: s.crew.map((c) =>
            c.id === crewMemberId
                ? {
                      ...c,
                      isMerged: false,
                      mergedModuleId: null,
                  }
                : c,
        ),
    }));

    if (moduleShip) {
        get().addLog(
            `🧬 ${crewMember.name} отсоединился от "${moduleShip.name}"`,
            "info",
        );
    }

    return true;
};

/**
 * Автоматически отсоединяет ксеноморфа при перемещении в другой модуль
 */
export const autoUnmergeOnMove = (
    crewMemberId: number,
    set: (fn: (s: GameState) => void) => void,
    get: () => GameStore,
): void => {
    const crewMember = get().crew.find((c) => c.id === crewMemberId);
    if (crewMember?.isMerged) {
        unmergeFromModule(crewMemberId, set, get);
    }
};
