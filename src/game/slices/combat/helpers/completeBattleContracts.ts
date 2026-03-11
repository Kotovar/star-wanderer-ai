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
    // Combat contracts (defeat any enemy in target sector)
    const completedCombat = get().activeContracts.filter(
        (c) => c.type === "combat" && c.sectorId === get().currentSector?.id,
    );
    completedCombat.forEach((c) => {
        set((s) => ({ credits: s.credits + c.reward }));
        get().addLog(`Задача "${c.desc}" выполнена! +${c.reward}₢`, "info");
        const rewardConfig = CONTRACT_REWARDS.combat;
        const expReward =
            rewardConfig.baseExp +
            enemyThreat * (rewardConfig.threatBonus ?? 0);
        giveCrewExperience(expReward, `Экипаж получил опыт: +${expReward} ед.`);
        set((s) => ({
            completedContractIds: [...s.completedContractIds, c.id],
            activeContracts: s.activeContracts.filter((ac) => ac.id !== c.id),
        }));
    });

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
        set((s) => ({
            completedContractIds: [...s.completedContractIds, c.id],
            activeContracts: s.activeContracts.filter((ac) => ac.id !== c.id),
        }));
    });

    // Mining contract (Crystalline race quest - mark boss as defeated)
    const miningContract = get().activeContracts.find(
        (c) => c.type === "mining" && c.isRaceQuest,
    );
    if (miningContract && isBoss) {
        set((s) => {
            s.activeContracts.forEach((ac) => {
                if (ac.id === miningContract.id) ac.bossDefeated = true;
            });
        });
        get().addLog(
            `Босс побеждён! Кристалл будет получен после исследования`,
            "info",
        );
    }
}
