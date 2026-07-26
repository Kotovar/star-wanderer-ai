import { store as i18nStore } from "@/lib/useTranslation";
import type { GameStore, SetState } from "@/game/types";
import { AUGMENTATIONS } from "@/game/constants/augmentations";
import { getMedicalAugmentationCatalog } from "@/game/stations/medicalAugmentations";
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

        const station = state.currentLocation;
        if (station?.type !== "station" || station.stationType !== "medical") {
            get().addLog(i18nStore.t("game_logs.augmentationsSlice_12"), "error");
            return;
        }

        const augmentation = AUGMENTATIONS[augmentationId];
        if (!augmentation) {
            get().addLog( i18nStore.t("game_logs.augmentationsSlice_2", { augmentationId }), "error");
            return;
        }
        const augmentationName = i18nStore.t(`augmentations.${augmentationId}.name`);

        const crewMember = state.crew.find((c) => c.id === crewId);
        if (!crewMember) {
            get().addLog( i18nStore.t("game_logs.augmentationsSlice_3"), "error");
            return;
        }

        const catalog = getMedicalAugmentationCatalog(
            station.stationId ?? station.id,
            station.dominantRace,
            state.currentSector?.tier ?? 1,
        );
        if (!catalog.includes(augmentationId)) {
            get().addLog(i18nStore.t("game_logs.augmentationsSlice_13"), "error");
            return;
        }

        if ((crewMember.level ?? 1) < 3) {
            get().addLog(i18nStore.t("game_logs.augmentationsSlice_14"), "error");
            return;
        }

        // Check profession restriction
        if (augmentation.forProfession && crewMember.profession !== augmentation.forProfession) {
            get().addLog( i18nStore.t("game_logs.augmentationsSlice_4", { augmentation_name: augmentationName, forProfession: augmentation.forProfession }),
                "error",
            );
            return;
        }

        // Check race restriction
        if (augmentation.forRace && crewMember.race !== augmentation.forRace) {
            get().addLog( i18nStore.t("game_logs.augmentationsSlice_5", { augmentation_name: augmentationName, forRace: i18nStore.t(`races.${augmentation.forRace}.name`) }),
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
            get().addLog( i18nStore.t("game_logs.augmentationsSlice_7", { crewMember_name: crewMember.name, augmentation: old ? i18nStore.t(`augmentations.${old.id}.name`) : existingId, augmentation_name: augmentationName }),
                "info",
            );
        } else {
            get().addLog( i18nStore.t("game_logs.augmentationsSlice_8", { crewMember_name: crewMember.name, augmentation_name: augmentationName }),
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

        const augName = AUGMENTATIONS[crewMember.augmentation]
            ? i18nStore.t(`augmentations.${crewMember.augmentation}.name`)
            : crewMember.augmentation;

        set((s) => ({
            crew: s.crew.map((c) =>
                c.id === crewId ? { ...c, augmentation: null } : c,
            ),
        }));

        get().addLog( i18nStore.t("game_logs.augmentationsSlice_11", { crewMember_name: crewMember.name, augName }), "info");
    },
});
