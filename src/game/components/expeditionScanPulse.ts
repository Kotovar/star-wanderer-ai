const GRID_SIZE = 5;

export function getExpeditionScanPulsePosition(index: number) {
  const column = index % GRID_SIZE;
  const row = Math.floor(index / GRID_SIZE);

  return {
    left: `${((column + 0.5) * 100) / GRID_SIZE}%`,
    top: `${((row + 0.5) * 100) / GRID_SIZE}%`,
  };
}

export function shouldAnimateExpeditionScan(
  animationsEnabled: boolean,
  prefersReducedMotion: boolean,
) {
  return animationsEnabled && !prefersReducedMotion;
}
