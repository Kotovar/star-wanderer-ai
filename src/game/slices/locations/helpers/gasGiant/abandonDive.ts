import { store as i18nStore } from "@/lib/useTranslation";
import type { SetState, GameStore } from "@/game/types";

export function abandonDive(set: SetState, get: () => GameStore): void {
  const state = get();
  if (!state.activeDive) return;

  set(() => ({
    activeDive: null,
  }));

  get().addLog( i18nStore.t("game_logs.abandonDive_1"), "warning");
}
