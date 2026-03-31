import { CONTRACT_REWARDS } from "@/game/constants";
import { giveCrewExperience } from "@/game/crew";
import type { GameState, GameStore, Location } from "@/game/types";

type SetState = {
    (partial: Partial<GameState> | ((state: GameState) => Partial<GameState>)): void;
};

/**
 * Завершает контракты expedition_survey при возврате на исходную планету.
 * Контракт помечается выполненным в endExpedition.ts — здесь просто выдаётся награда.
 */
export const handleExpeditionSurveyContracts = (
    loc: Location,
    set: SetState,
    get: () => GameStore,
): void => {
    const ready = get().activeContracts.filter(
        (c) =>
            c.type === "expedition_survey" &&
            c.sourcePlanetId === loc.id &&
            c.expeditionDone === true,
    );

    ready.forEach((c) => {
        set((s) => ({
            credits: s.credits + (c.reward ?? 0),
            completedContractIds: [...s.completedContractIds, c.id],
            activeContracts: s.activeContracts.filter((ac) => ac.id !== c.id),
        }));
        get().addLog(
            `🗺️ Контракт выполнен: планетарное исследование сдано +${c.reward}₢`,
            "info",
        );
        const expReward = CONTRACT_REWARDS.expedition_survey.baseExp;
        giveCrewExperience(expReward, `Экипаж получил опыт: +${expReward} ед.`);
        if (c.sourceDominantRace) {
            get().changeReputation(c.sourceDominantRace, 2);
        }
    });
};
