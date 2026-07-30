import { create } from "zustand";
import type { CombatTurnTimeline } from "@/game/types/combatCinematics";

interface CombatCinematicUiState {
  timeline: CombatTurnTimeline | null;
  startCombatPlayback: (timeline: CombatTurnTimeline) => void;
  finishCombatPlayback: () => void;
}

export const useCombatCinematicUiStore = create<CombatCinematicUiState>((set) => ({
  timeline: null,
  startCombatPlayback: (timeline) => set({ timeline }),
  finishCombatPlayback: () => set({ timeline: null }),
}));
