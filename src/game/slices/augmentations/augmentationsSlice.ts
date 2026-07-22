import { store as i18nStore } from "@/lib/useTranslation";
import type { GameStore, SetState } from "@/game/types";
import { AUGMENTATIONS } from "@/game/constants/augmentations";
import type { AugmentationId } from "@/game/types/augmentations";

export interface AugmentationsSlice {
    installAugmentation: (crewId: number, augmentationId: AugmentationId) => void;
    removeAugmentation: (crewId: number) => void;
}

export const createAugmentationsSlice = (
    set: SetState,
    get: () => GameStore,
): AugmentationsSlice => ({
    installAugmentation: (crewId, augmentationId) => {
        const state = get();

        if (!state.research.researchedTechs.includes("cybernetic_augmentation")) {
            get().addLog( i18nStore.t("game_logs.augmentationsSlice_1"), "error");
            return;
        }

        const augmentation = AUGMENTATIONS[augmentationId];
        if (!augmentation) {
            get().addLog( i18nStore.t("game_logs.augmentationsSlice_2", { augmentationId }), "error");
            return;
        }

        const crewMember = state.crew.find((c) => c.id === crewId);
        if (!crewMember) {
            get().addLog( i18nStore.t("game_logs.augmentationsSlice_3"), "error");
            return;
        }

        // Check profession restriction
        if (augmentation.forProfession && crewMember.profession !== augmentation.forProfession) {
            get().addLog( i18nStore.t("game_logs.augmentationsSlice_4", { augmentation_name: augmentation.name, forProfession: augmentation.forProfession }),
                "error",
            );
            return;
        }

        // Check race restriction
        if (augmentation.forRace && crewMember.race !== augmentation.forRace) {
            get().addLog( i18nStore.t("game_logs.augmentationsSlice_5", { augmentation_name: augmentation.name, forRace: i18nStore.t(`races.${augmentation.forRace}.name`) }),
                "error",
            );
            return;
        }

        if (state.credits < augmentation.installCost) {
            get().addLog( i18nStore.t("game_logs.augmentationsSlice_6", { installCost: augmentation.installCost }),
                "error",
            );
            return;
        }

        const hasExisting = crewMember.augmentation !== null;

        set((s) => ({
            credits: s.credits - augmentation.installCost,
            crew: s.crew.map((c) =>
                c.id === crewId ? { ...c, augmentation: augmentationId } : c,
            ),
        }));

        if (hasExisting) {
            const existingId = crewMember.augmentation ?? augmentationId;
            const old = AUGMENTATIONS[existingId];
            get().addLog( i18nStore.t("game_logs.augmentationsSlice_7", { crewMember_name: crewMember.name, augmentation: old?.name ?? crewMember.augmentation, augmentation_name: augmentation.name }),
                "info",
            );
        } else {
            get().addLog( i18nStore.t("game_logs.augmentationsSlice_8", { crewMember_name: crewMember.name, augmentation_name: augmentation.name }),
                "info",
            );
        }
    },

    removeAugmentation: (crewId) => {
        const state = get();
        const crewMember = state.crew.find((c) => c.id === crewId);

        if (!crewMember) {
            get().addLog( i18nStore.t("game_logs.augmentationsSlice_9"), "error");
            return;
        }

        if (!crewMember.augmentation) {
            get().addLog( i18nStore.t("game_logs.augmentationsSlice_10"), "error");
            return;
        }

        const augName = AUGMENTATIONS[crewMember.augmentation]?.name ?? crewMember.augmentation;

        set((s) => ({
            crew: s.crew.map((c) =>
                c.id === crewId ? { ...c, augmentation: null } : c,
            ),
        }));

        get().addLog( i18nStore.t("game_logs.augmentationsSlice_11", { crewMember_name: crewMember.name, augName }), "info");
    },
});
