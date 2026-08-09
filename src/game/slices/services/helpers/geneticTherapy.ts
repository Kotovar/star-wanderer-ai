import { store as i18nStore } from "@/lib/useTranslation";
import { getCrewDisplayName } from "@/game/crew/crewNames";
import type { GameStore, SetState } from "@/game/types";
import { GENETIC_THERAPY_PRICE } from "../constants";

export const treatNegativeTrait = (
    crewId: number,
    traitId: string,
    set: SetState,
    get: () => GameStore,
): void => {
    const state = get();

    if (!state.research.researchedTechs.includes("genetic_enhancement")) {
        get().addLog(i18nStore.t("game_logs.geneticTherapy_1"), "error");
        return;
    }
    if (state.credits < GENETIC_THERAPY_PRICE) {
        get().addLog(
            i18nStore.t("game_logs.geneticTherapy_2", {
                cost: GENETIC_THERAPY_PRICE,
            }),
            "error",
        );
        return;
    }

    const crewMember = state.crew.find((crew) => crew.id === crewId);
    if (!crewMember) {
        get().addLog(i18nStore.t("game_logs.geneticTherapy_3"), "error");
        return;
    }
    if (crewMember.geneticTherapyUsed) {
        get().addLog(
            i18nStore.t("game_logs.geneticTherapy_4", {
                crewMember_name: getCrewDisplayName(crewMember),
            }),
            "error",
        );
        return;
    }

    const trait = crewMember.traits.find(
        (candidate) =>
            candidate.id === traitId && candidate.type === "negative",
    );
    if (!trait) {
        get().addLog(i18nStore.t("game_logs.geneticTherapy_5"), "error");
        return;
    }

    set((current) => ({
        credits: current.credits - GENETIC_THERAPY_PRICE,
        crew: current.crew.map((crew) => {
            if (crew.id !== crewId) return crew;

            const updated = {
                ...crew,
                traits: crew.traits.filter((candidate) => candidate.id !== traitId),
                geneticTherapyUsed: true,
            };
            const healthPenalty = trait.effect.healthPenalty;
            if (healthPenalty && healthPenalty < 1) {
                updated.maxHealth = Math.round(
                    updated.maxHealth / (1 - healthPenalty),
                );
            }
            return updated;
        }),
    }));

    get().addLog(
        i18nStore.t("game_logs.geneticTherapy_6", {
            crewMember_name: getCrewDisplayName(crewMember),
            trait_name: trait.name,
        }),
        "info",
    );
};
