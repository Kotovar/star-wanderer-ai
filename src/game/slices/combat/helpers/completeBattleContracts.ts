import { store as i18nStore } from "@/lib/useTranslation";
import type { GameState, GameStore } from "@/game/types";
import { CONTRACT_REWARDS } from "@/game/constants";
import { giveCrewExperience } from "@/game/crew";

/**
 * Completes combat and bounty contracts after battle victory
 */
export function completeBattleContracts(
    set: (fn: (s: GameState) => void) => void,
    get: () => GameStore,
    enemyThreat: number,
    isBoss: boolean,
) {
    // Standard combat contracts (defeat any enemy in target sector)
    const completedCombat = isBoss
        ? []
        : get().activeContracts.filter(
              (c) =>
                  c.type === "combat" &&
                  !c.isRaceQuest &&
                  c.sectorId === get().currentSector?.id,
          );
    completedCombat.forEach((c) => {
        set((s) => ({ credits: s.credits + c.reward }));
        get().addLog( i18nStore.t("game_logs.completeBattleContracts_1", { reward: c.reward }), "info");
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
                get().addLog( i18nStore.t("game_logs.completeBattleContracts_2", { reward: c.reward }), "info");
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
                get().addLog( i18nStore.t("game_logs.completeBattleContracts_3", { remainingEnemies_length: remainingEnemies.length }),
                    "info",
                );
            }
        });
    }

    // Bounty contracts (defeat enemy with required threat in target sector)
    const completedBounty = isBoss
        ? []
        : get().activeContracts.filter(
              (c) =>
                  c.type === "bounty" &&
                  c.targetSector === get().currentSector?.id &&
                  enemyThreat >= (c.targetThreat ?? 1),
          );
    completedBounty.forEach((c) => {
        set((s) => ({ credits: s.credits + c.reward }));
        get().addLog( i18nStore.t("game_logs.completeBattleContracts_4", { reward: c.reward }), "info");
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
}
