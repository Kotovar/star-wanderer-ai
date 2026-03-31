import { CONTRACT_REWARDS } from "@/game/constants";
import { giveCrewExperience } from "@/game/crew";
import type { GameState, GameStore, Location } from "@/game/types";

type SetState = {
    (partial: Partial<GameState> | ((state: GameState) => Partial<GameState>)): void;
};

/**
 * Завершает контракты gas_dive при возврате на исходную планету.
 *
 * Чтобы одни и те же мембраны нельзя было засчитать в несколько контрактов:
 * при завершении контракта вычитаем его requiredMembranes из счётчиков
 * всех прочих активных gas_dive контрактов.
 */
export const handleGasDiveContracts = (
    loc: Location,
    set: SetState,
    get: () => GameStore,
): void => {
    const ready = get().activeContracts.filter(
        (c) =>
            c.type === "gas_dive" &&
            c.sourcePlanetId === loc.id &&
            (c.collectedMembranes ?? 0) >= (c.requiredMembranes ?? 1),
    );

    ready.forEach((c) => {
        const consumed = c.requiredMembranes ?? 1;

        set((s) => ({
            credits: s.credits + (c.reward ?? 0),
            completedContractIds: [...s.completedContractIds, c.id],
            activeContracts: s.activeContracts
                .filter((ac) => ac.id !== c.id)
                .map((ac) =>
                    ac.type === "gas_dive"
                        ? {
                              ...ac,
                              collectedMembranes: Math.max(
                                  0,
                                  (ac.collectedMembranes ?? 0) - consumed,
                              ),
                          }
                        : ac,
                ),
        }));
        get().addLog(
            `🪸 Контракт выполнен: образцы мембран сданы (${c.collectedMembranes}/${c.requiredMembranes}) +${c.reward}₢`,
            "info",
        );
        const expReward = CONTRACT_REWARDS.gas_dive.baseExp;
        giveCrewExperience(expReward, `Экипаж получил опыт: +${expReward} ед.`);
        if (c.sourceDominantRace) {
            get().changeReputation(c.sourceDominantRace, 2);
        }
    });
};
