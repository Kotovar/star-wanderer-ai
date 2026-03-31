import type { GameState, GameStore } from "@/game/types";
import { CONTRACT_REWARDS } from "@/game/constants";
import { giveCrewExperience } from "@/game/crew";

/**
 * Completes combat, bounty and mining contracts after battle victory
 */
export function completeBattleContracts(
    set: (fn: (s: GameState) => void) => void,
    get: () => GameStore,
    enemyThreat: number,
    isBoss: boolean,
) {
    // Standard combat contracts (defeat any enemy in target sector)
    const completedCombat = get().activeContracts.filter(
        (c) =>
            c.type === "combat" &&
            !c.isRaceQuest &&
            c.sectorId === get().currentSector?.id,
    );
    completedCombat.forEach((c) => {
        set((s) => ({ credits: s.credits + c.reward }));
        get().addLog(`Задача выполнена! +${c.reward}₢`, "info");
        const rewardConfig = CONTRACT_REWARDS.combat;
        const expReward =
            rewardConfig.baseExp +
            enemyThreat * (rewardConfig.threatBonus ?? 0);
        giveCrewExperience(expReward, `Экипаж получил опыт: +${expReward} ед.`);
        if (c.sourceDominantRace) {
            get().changeReputation(c.sourceDominantRace, 2);
        }
        set((s) => ({
            completedContractIds: [...s.completedContractIds, c.id],
            activeContracts: s.activeContracts.filter((ac) => ac.id !== c.id),
        }));
    });

    // Krylorian race combat contracts (defeat ALL non-boss enemies in target sector)
    const raceCombat = get().activeContracts.filter(
        (c) =>
            c.type === "combat" &&
            c.isRaceQuest &&
            c.sectorId === get().currentSector?.id,
    );
    if (raceCombat.length > 0 && !isBoss) {
        const remainingEnemies =
            get().currentSector?.locations.filter(
                (l) => l.type === "enemy" && !l.defeated,
            ) ?? [];

        raceCombat.forEach((c) => {
            if (remainingEnemies.length === 0) {
                set((s) => ({ credits: s.credits + c.reward }));
                get().addLog(`🦎 Дуэль чести завершена! +${c.reward}₢`, "info");
                const rewardConfig = CONTRACT_REWARDS.combat;
                const expReward =
                    rewardConfig.baseExp +
                    enemyThreat * (rewardConfig.threatBonus ?? 0);
                giveCrewExperience(
                    expReward,
                    `Экипаж получил опыт: +${expReward} ед.`,
                );

                if (c.requiredRace) {
                    get().changeReputation(c.requiredRace, 10);
                }

                set((s) => ({
                    completedContractIds: [...s.completedContractIds, c.id],
                    activeContracts: s.activeContracts.filter(
                        (ac) => ac.id !== c.id,
                    ),
                }));
            } else {
                get().addLog(
                    `🦎 Осталось врагов в секторе: ${remainingEnemies.length}`,
                    "info",
                );
            }
        });
    }

    // Bounty contracts (defeat enemy with required threat in target sector)
    const completedBounty = get().activeContracts.filter(
        (c) =>
            c.type === "bounty" &&
            c.targetSector === get().currentSector?.id &&
            enemyThreat >= (c.targetThreat ?? 1),
    );
    completedBounty.forEach((c) => {
        set((s) => ({ credits: s.credits + c.reward }));
        get().addLog(`Охота выполнена! +${c.reward}₢`, "info");
        const rewardConfig = CONTRACT_REWARDS.bounty;
        const expReward =
            rewardConfig.baseExp +
            enemyThreat * (rewardConfig.threatBonus ?? 0);
        giveCrewExperience(expReward, `Экипаж получил опыт: +${expReward} ед.`);
        if (c.sourceDominantRace) {
            get().changeReputation(c.sourceDominantRace, 2);
        }
        set((s) => ({
            completedContractIds: [...s.completedContractIds, c.id],
            activeContracts: s.activeContracts.filter((ac) => ac.id !== c.id),
        }));
    });

    // Mining contract (Crystalline race quest - boss defeat completes the quest)
    const miningContract = get().activeContracts.find(
        (c) => c.type === "mining" && c.isRaceQuest,
    );
    if (miningContract && isBoss) {
        const reward = miningContract.reward || 0;
        set((s) => ({
            credits: s.credits + reward,
            completedContractIds: [
                ...s.completedContractIds,
                miningContract.id,
            ],
            activeContracts: s.activeContracts.filter(
                (ac) => ac.id !== miningContract.id,
            ),
        }));
        const expReward = CONTRACT_REWARDS.mining.baseExp;
        giveCrewExperience(expReward, `Экипаж получил опыт: +${expReward} ед.`);
        get().addLog(`Артефакт для задания найден! +${reward}₢`, "info");
        if (miningContract.requiredRace) {
            get().changeReputation(miningContract.requiredRace, 10);
        }
    }
}
