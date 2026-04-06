import type { SetState, GameStore } from "@/game/types";

export function abandonDive(set: SetState, get: () => GameStore): void {
  const state = get();
  if (!state.activeDive) return;

  set(() => ({
    activeDive: null,
  }));

  get().addLog("🪸 Погружение прервано. Зонд утерян.", "warning");
}
