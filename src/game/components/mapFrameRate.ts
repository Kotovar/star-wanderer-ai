export const MAIN_MAP_FRAME_INTERVAL_MS = 1000 / 30;

export function shouldRedrawMainMap(lastDrawAt: number, timestamp: number) {
  return timestamp - lastDrawAt >= MAIN_MAP_FRAME_INTERVAL_MS;
}
