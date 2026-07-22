import { store as i18nStore } from "@/lib/useTranslation";
import type { GameStore, CrewMember, SetState } from "@/game/types";
import { hireCrew as hireCrewAction } from "./utils";
import { fireCrewMember as fireCrewMemberAction } from "./utils";

/**
 * Интерфейс CrewManagementSlice
 */
export interface CrewManagementSlice {
    /**
     * Наём члена экипажа
     * @param crewData - Данные экипажа (включая price)
     * @param locationId - ID локации (станции или корабля)
     */
    hireCrew: (
        crewData: Partial<CrewMember> & { price: number },
        locationId?: string,
    ) => void;
    /**
     * Увольнение члена экипажа
     * @param crewId - ID члена экипажа
     */
    fireCrewMember: (crewId: number) => void;
    /** Принять ожидающего выжившего в экипаж */
    acceptSurvivor: () => void;
    /** Отказать ожидающему выжившему */
    declineSurvivor: () => void;
}

/**
 * Создаёт crewManagement слайс для обработки найма и увольнения экипажа
 */
export const createCrewManagementSlice = (
    set: SetState,
    get: () => GameStore,
): CrewManagementSlice => ({
    hireCrew: (crewData, locationId) =>
        hireCrewAction(set, get, crewData, locationId),

    fireCrewMember: (crewId) => fireCrewMemberAction(set, get, crewId),

    acceptSurvivor: () => {
        const survivor = get().pendingSurvivor;
        if (!survivor) return;
        set((s) => ({ crew: [...s.crew, survivor], pendingSurvivor: null }));
        get().addLog( i18nStore.t("game_logs.createCrewManagementSlice_1", { survivor_name: survivor.name }),
            "info",
        );
    },

    declineSurvivor: () => {
        const survivor = get().pendingSurvivor;
        if (!survivor) return;
        set(() => ({ pendingSurvivor: null }));
        get().addLog( i18nStore.t("game_logs.createCrewManagementSlice_2", { survivor_name: survivor.name }), "warning");
    },
});
