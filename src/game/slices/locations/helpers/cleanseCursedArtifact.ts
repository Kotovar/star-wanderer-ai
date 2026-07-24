import { store as i18nStore } from "@/lib/useTranslation";
import type { GameStore, SetState } from "@/game/types";

/**
 * Снимает проклятие с артефакта через резонанс с Кристальной Гидрой.
 *
 * Требует активный контракт cleanse_curse, нацеленный на текущую локацию,
 * и уже обнаруженный проклятый артефакт на борту. Снимает cursed и все
 * негативные эффекты необратимо — положительный эффект артефакта сохраняется.
 */
export const cleanseCursedArtifact = (
    artifactId: string,
    set: SetState,
    get: () => GameStore,
): void => {
    const state = get();
    const location = state.currentLocation;
    if (!location || location.type !== "space_monster") return;

    const contract = state.activeContracts.find(
        (c) => c.type === "cleanse_curse" && c.targetLocationId === location.id,
    );
    if (!contract) {
        get().addLog(
            i18nStore.t("game_logs.cleanseCursedArtifact_1"),
            "warning",
        );
        return;
    }

    const artifact = state.artifacts.find((a) => a.id === artifactId);
    if (!artifact || !artifact.discovered || !artifact.cursed) {
        get().addLog(
            i18nStore.t("game_logs.cleanseCursedArtifact_2"),
            "warning",
        );
        return;
    }

    set((s) => ({
        artifacts: s.artifacts.map((a) =>
            a.id === artifactId
                ? {
                      ...a,
                      cursed: false,
                      negativeEffect: undefined,
                      negativeEffects: undefined,
                  }
                : a,
        ),
        credits: s.credits + (contract.reward ?? 0),
        completedContractIds: [...s.completedContractIds, contract.id],
        activeContracts: s.activeContracts.filter((c) => c.id !== contract.id),
    }));

    get().addLog(
        i18nStore.t("game_logs.cleanseCursedArtifact_3", {
            artifact_name: artifact.name,
            reward: contract.reward ?? 0,
        }),
        "info",
    );
    if (contract.sourceDominantRace) {
        get().changeReputation(contract.sourceDominantRace, 2);
    }
};
