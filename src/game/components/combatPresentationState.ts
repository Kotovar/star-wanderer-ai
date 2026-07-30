import type { CombatState } from "../types/combat";

export function createCombatPresentationSnapshot(
  combat: CombatState,
): CombatState {
  return {
    ...combat,
    enemy: {
      ...combat.enemy,
      modules: combat.enemy.modules.map((module) => ({ ...module })),
      specialAbility: combat.enemy.specialAbility
        ? { ...combat.enemy.specialAbility }
        : undefined,
    },
  };
}

export function getPresentedCombat(
  currentCombat: CombatState | null,
  playbackCombat: CombatState | null,
  isPlaybackActive: boolean,
): CombatState | null {
  return isPlaybackActive ? playbackCombat ?? currentCombat : currentCombat;
}
