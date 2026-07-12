export function rollEnemyThreat(
  tier: number,
  isBlackHole: boolean,
  roll = Math.random(),
): number {
  const baseThreat = Math.min(4, Math.max(1, tier));
  const variation = roll < 0.25 ? -1 : roll >= 0.75 ? 1 : 0;
  return Math.min(6, Math.max(1, baseThreat + variation + (isBlackHole ? 1 : 0)));
}
