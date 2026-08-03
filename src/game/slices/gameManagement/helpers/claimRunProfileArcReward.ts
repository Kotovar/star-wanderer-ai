import type { GameStore, ResearchResourceType, SetState } from "@/game/types";
import { getRunProfileArcProgress } from "@/game/galaxy/runProfileArcs";
import { store as i18nStore } from "@/lib/useTranslation";

export function claimRunProfileArcReward(
  set: SetState,
  get: () => GameStore,
): void {
  const state = get();
  if (state.runProfileArcRewardClaimed) return;

  const progress = getRunProfileArcProgress(
    state.runProfileId,
    state.galaxy.sectors,
    state.completedLocations,
  );
  if (!progress?.isComplete) return;

  set((draft) => {
    const resources = { ...draft.research.resources };
    for (const [resource, amount] of Object.entries(progress.reward) as [
      ResearchResourceType,
      number,
    ][]) {
      resources[resource] = (resources[resource] ?? 0) + amount;
    }
    return {
      research: { ...draft.research, resources },
      runProfileArcRewardClaimed: true,
    };
  });

  get().addLog(
    i18nStore.t("game_logs.run_profile_arc_claimed", {
      profile: i18nStore.t(progress.profile.nameKey),
      reward: i18nStore.t(progress.profile.arc.rewardKey),
    }),
    "info",
  );
  get().saveGame();
}
