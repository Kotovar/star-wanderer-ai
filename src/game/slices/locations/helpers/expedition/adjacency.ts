import type { ExploreTile } from "@/game/types/exploration";
import {
    EXPEDITION_GRID_SIZE,
    EXPEDITION_START_INDEX,
} from "./constants";

/** Ортогональные соседи клетки (вверх/вниз/влево/вправо). */
export function getNeighborIndices(index: number): number[] {
    const row = Math.floor(index / EXPEDITION_GRID_SIZE);
    const col = index % EXPEDITION_GRID_SIZE;
    const neighbors: number[] = [];
    if (row > 0) neighbors.push(index - EXPEDITION_GRID_SIZE);
    if (row < EXPEDITION_GRID_SIZE - 1) neighbors.push(index + EXPEDITION_GRID_SIZE);
    if (col > 0) neighbors.push(index - 1);
    if (col < EXPEDITION_GRID_SIZE - 1) neighbors.push(index + 1);
    return neighbors;
}

/**
 * Доступна ли клетка для раскрытия в пространственной сетке.
 * Пока ничего не открыто — доступна только зона высадки (центр).
 * Далее — только клетки, смежные (ортогонально) уже раскрытым.
 */
export function isTileReachable(grid: ExploreTile[], index: number): boolean {
    const tile = grid[index];
    if (!tile || tile.revealed) return false;
    const anyRevealed = grid.some((t) => t.revealed);
    if (!anyRevealed) return index === EXPEDITION_START_INDEX;
    return getNeighborIndices(index).some((n) => grid[n]?.revealed);
}
