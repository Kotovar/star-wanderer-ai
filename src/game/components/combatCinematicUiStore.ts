import { create } from "zustand";
import type { CombatTurnTimeline } from "@/game/types/combatCinematics";

interface CombatCinematicUiState {
  timeline: CombatTurnTimeline | null;
  showCombatCinematic: (timeline: CombatTurnTimeline) => void;
  dismissCombatCinematic: () => void;
}

export const useCombatCinematicUiStore = create<CombatCinematicUiState>((set) => ({
  timeline: null,
  showCombatCinematic: (timeline) => set({ timeline }),
  dismissCombatCinematic: () => set({ timeline: null }),
}));
