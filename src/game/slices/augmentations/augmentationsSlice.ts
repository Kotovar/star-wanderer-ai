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
            get().addLog("Требуется технология: Кибернетические аугментации", "error");
            return;
        }

        const augmentation = AUGMENTATIONS[augmentationId];
        if (!augmentation) {
            get().addLog(`Аугментация "${augmentationId}" не найдена`, "error");
            return;
        }

        const crewMember = state.crew.find((c) => c.id === crewId);
        if (!crewMember) {
            get().addLog("Член экипажа не найден", "error");
            return;
        }

        // Check profession restriction
        if (augmentation.forProfession && crewMember.profession !== augmentation.forProfession) {
            get().addLog(
                `${augmentation.name} доступна только для: ${augmentation.forProfession}`,
                "error",
            );
            return;
        }

        // Check race restriction
        if (augmentation.forRace && crewMember.race !== augmentation.forRace) {
            get().addLog(
                `${augmentation.name} доступна только для расы: ${augmentation.forRace}`,
                "error",
            );
            return;
        }

        if (state.credits < augmentation.installCost) {
            get().addLog(
                `Недостаточно кредитов: нужно ${augmentation.installCost}₢`,
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
            get().addLog(
                `🦾 ${crewMember.name}: аугментация "${old?.name ?? crewMember.augmentation}" заменена на "${augmentation.name}"`,
                "info",
            );
        } else {
            get().addLog(
                `🦾 ${crewMember.name}: установлена аугментация "${augmentation.name}"`,
                "info",
            );
        }
    },

    removeAugmentation: (crewId) => {
        const state = get();
        const crewMember = state.crew.find((c) => c.id === crewId);

        if (!crewMember) {
            get().addLog("Член экипажа не найден", "error");
            return;
        }

        if (!crewMember.augmentation) {
            get().addLog("У члена экипажа нет аугментации", "error");
            return;
        }

        const augName = AUGMENTATIONS[crewMember.augmentation]?.name ?? crewMember.augmentation;

        set((s) => ({
            crew: s.crew.map((c) =>
                c.id === crewId ? { ...c, augmentation: null } : c,
            ),
        }));

        get().addLog(`🔧 ${crewMember.name}: аугментация "${augName}" удалена`, "info");
    },
});
