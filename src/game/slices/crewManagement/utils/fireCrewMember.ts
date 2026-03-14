import type { GameStore, SetState } from "@/game/types";

/**
 * Результат проверки возможности увольнения
 */
interface FireValidation {
    /** Можно ли уволить */
    canFire: boolean;
    /** Сообщение об ошибке */
    error?: string;
}

/**
 * Проверяет возможность увольнения члена экипажа
 * @param state - Текущее состояние игры
 * @param crewId - ID члена экипажа
 * @returns Результат проверки
 */
const validateFireCrew = (state: GameStore, crewId: number): FireValidation => {
    const crewMember = state.crew.find((c) => c.id === crewId);

    if (!crewMember) {
        return { canFire: false, error: "Член экипажа не найден!" };
    }

    // Нельзя уволить последнего члена экипажа
    if (state.crew.length <= 1) {
        return {
            canFire: false,
            error: "Нельзя уволить последнего члена экипажа!",
        };
    }

    return { canFire: true };
};

/**
 * Увольнение члена экипажа
 * @param set - Функция обновления состояния
 * @param get - Функция получения состояния
 * @param crewId - ID члена экипажа
 */
export const fireCrewMember = (
    set: SetState,
    get: () => GameStore,
    crewId: number,
): void => {
    const state = get();

    // Проверка возможности увольнения
    const validation = validateFireCrew(state, crewId);
    if (!validation.canFire) {
        if (validation.error) {
            get().addLog(validation.error, "error");
        }
        return;
    }

    const crewMember = state.crew.find((c) => c.id === crewId);

    // Обновление состояния
    set((s) => ({
        crew: s.crew.filter((c) => c.id !== crewId),
    }));

    if (crewMember) {
        get().addLog(`${crewMember.name} уволен`, "warning");
    }
};
