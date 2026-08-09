import { store as i18nStore } from "@/lib/useTranslation";
import { getCrewDisplayName } from "@/game/crew/crewNames";
import type { GameStore, Profession, SetState } from "@/game/types";
import { playSound } from "@/sounds";

export const ACADEMY_RETRAIN_COST = 1000;

export const getAcademyRetrainingCooldownKey = (planetId: string): string =>
    `academy-retraining:${planetId}`;

export const retrainCrewMember = (
    crewMemberId: number,
    profession: Profession,
    set: SetState,
    get: () => GameStore,
): boolean => {
    const state = get();
    const planet = state.currentLocation;

    if (!state.research.researchedTechs.includes("crew_training")) {
        get().addLog(i18nStore.t("game_logs.retrainCrew_1"), "error");
        return false;
    }
    if (planet?.type !== "planet" || planet.dominantRace !== "human") {
        get().addLog(i18nStore.t("game_logs.retrainCrew_2"), "error");
        return false;
    }

    const cooldownKey = getAcademyRetrainingCooldownKey(planet.id);
    if (state.planetCooldowns[cooldownKey]) {
        get().addLog(i18nStore.t("game_logs.retrainCrew_3"), "error");
        return false;
    }

    const crewMember = state.crew.find((crew) => crew.id === crewMemberId);
    if (!crewMember) {
        get().addLog(i18nStore.t("game_logs.retrainCrew_4"), "error");
        return false;
    }
    if (crewMember.level < 1 || crewMember.level > 3) {
        get().addLog(i18nStore.t("game_logs.retrainCrew_5"), "error");
        return false;
    }
    if (crewMember.profession === profession) {
        get().addLog(i18nStore.t("game_logs.retrainCrew_6"), "error");
        return false;
    }
    if (state.credits < ACADEMY_RETRAIN_COST) {
        get().addLog(
            i18nStore.t("game_logs.retrainCrew_7", {
                cost: ACADEMY_RETRAIN_COST,
            }),
            "error",
        );
        return false;
    }

    set((current) => ({
        credits: current.credits - ACADEMY_RETRAIN_COST,
        planetCooldowns: { ...current.planetCooldowns, [cooldownKey]: 999 },
        crew: current.crew.map((crew) =>
            crew.id === crewMemberId ? { ...crew, profession } : crew,
        ),
    }));

    get().addLog(
        i18nStore.t("game_logs.retrainCrew_8", {
            crewMember_name: getCrewDisplayName(crewMember),
            profession: i18nStore.t(`professions.${profession}`),
        }),
        "info",
    );
    playSound("world_crew_milestone");
    return true;
};
