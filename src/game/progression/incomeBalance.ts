export function scaleScoutingReward(baseReward: number, tier: number): number {
  return Math.round(baseReward * (1 + (Math.max(1, tier) - 1) * 0.5));
}
