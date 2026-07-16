import type { SetState, GameStore } from "@/game/types";
import type { ExpeditionScanMode } from "@/game/types/exploration";
import { isTileReachable } from "./adjacency";

/**
 * Сканирует клетку: учёные видят доступную, а корабельный сканер — любую.
 * Помечает клетку как peeked, не тратит AP и не применяет её эффект.
 */
export function scanExpeditionTile(
    tileIndex: number,
    scanMode: ExpeditionScanMode,
    set: SetState,
    get: () => GameStore,
): void {
    const expedition = get().activeExpedition;
    if (!expedition || expedition.finished) return;
    if (expedition.activeRuinsEvent) return;

    if (scanMode === "scientist") {
        if ((expedition.scansRemaining ?? 0) <= 0) return;
    } else if (!expedition.orbitalScanAvailable) {
        return;
    }

    const tile = expedition.grid[tileIndex];
    if (!tile || tile.revealed || tile.peeked) return;
    if (
        scanMode === "scientist" &&
        !isTileReachable(expedition.grid, tileIndex)
    ) {
        return;
    }

    set((s) => ({
        activeExpedition: s.activeExpedition
            ? {
                  ...s.activeExpedition,
                  scansRemaining:
                      scanMode === "scientist"
                          ? (s.activeExpedition.scansRemaining ?? 0) - 1
                          : s.activeExpedition.scansRemaining,
                  orbitalScanAvailable:
                      scanMode === "orbital"
                          ? false
                          : s.activeExpedition.orbitalScanAvailable,
                  grid: s.activeExpedition.grid.map((t, i) =>
                      i === tileIndex ? { ...t, peeked: true } : t,
                  ),
              }
            : null,
    }));
}
