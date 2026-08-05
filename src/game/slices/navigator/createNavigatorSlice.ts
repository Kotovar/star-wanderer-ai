import { collectNavigatorIntel } from "@/game/navigator/intel";
import {
  getNavigatorLocationKey,
  type NavigatorTarget,
} from "@/game/types/navigator";
import type { GameStore, SetState } from "@/game/types";

export interface NavigatorSlice {
  syncNavigatorIntel: () => void;
  pinNavigatorTarget: (target: NavigatorTarget) => void;
  unpinNavigatorTarget: (target: NavigatorTarget) => void;
  clearNavigatorTargets: () => void;
}

export const createNavigatorSlice = (
  set: SetState,
  get: () => GameStore,
): NavigatorSlice => ({
  syncNavigatorIntel: () => {
    const state = get();
    if (!state.currentSector) return;

    const collected = collectNavigatorIntel(state, state.currentSector);
    const additions = Object.fromEntries(
      Object.entries(collected).filter(([key, intel]) => {
        const current = state.knownLocationIntel[key];
        return (
          !current ||
          intel.highestScanRange > current.highestScanRange ||
          (intel.visited && !current.visited)
        );
      }),
    );
    if (Object.keys(additions).length === 0) return;

    set((draft) => ({
      knownLocationIntel: { ...draft.knownLocationIntel, ...additions },
    }));
  },

  pinNavigatorTarget: (target) => {
    const key = getNavigatorLocationKey(target.sectorId, target.locationId);
    if (
      get().navigatorTargets.some(
        (current) =>
          getNavigatorLocationKey(current.sectorId, current.locationId) === key,
      )
    ) {
      return;
    }
    set((state) => ({
      navigatorTargets: [...state.navigatorTargets, target],
    }));
  },

  unpinNavigatorTarget: (target) => {
    const targets = get().navigatorTargets.filter(
      (current) =>
        current.sectorId !== target.sectorId ||
        current.locationId !== target.locationId,
    );
    if (targets.length === get().navigatorTargets.length) return;
    set({ navigatorTargets: targets });
  },

  clearNavigatorTargets: () => {
    if (get().navigatorTargets.length === 0) return;
    set({ navigatorTargets: [] });
  },
});
