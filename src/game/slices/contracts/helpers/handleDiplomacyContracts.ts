import { CONTRACT_REWARDS } from "@/game/constants";
import { giveCrewExperience } from "@/game/crew";
import type { GameState, GameStore, Location } from "@/game/types";

// Тип для set с поддержкой immer (позволяет и мутации, и объекты)
type SetState = {
    (partial: Partial<GameState> | ((state: GameState) => Partial<GameState>)): void;
};

/**
 * Обрабатывает дипломатические контракты
 * @param loc - Локация (планета)
 * @param set - Функция обновления состояния
 * @param get - Функция получения состояния
 */
export const handleDiplomacyContracts = (
    loc: Location,
    set: SetState,
    get: () => GameStore,
): void => {
    const state = get();

    if (loc.dominantRace !== "human" || loc.isEmpty) return;

    const diplomacyContract = get().activeContracts.find(
        (c) =>
            c.type === "diplomacy" &&
            c.isRaceQuest &&
            c.targetSector === state.currentSector?.id,
    );

    if (!diplomacyContract) return;

    set((s) => ({
        credits: s.credits + (diplomacyContract.reward || 0),
    }));
    get().addLog(
        `Дипломатическая миссия выполнена! +${diplomacyContract.reward}₢`,
        "info",
    );
    get().changeReputation("human", 10);

    // Give experience to all crew members
    const expReward = CONTRACT_REWARDS.diplomacy.baseExp;
    giveCrewExperience(expReward, `Экипаж получил опыт: +${expReward} ед.`);

    set((s) => ({
        completedContractIds: [...s.completedContractIds, diplomacyContract.id],
        activeContracts: s.activeContracts.filter(
            (ac) => ac.id !== diplomacyContract.id,
        ),
    }));
};
