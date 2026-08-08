import type { ExploreTile } from "@/game/types/exploration";
import { getDrillsDone } from "../planetaryDrill";
import {
    EXPEDITION_PREP_PEEK_CAP,
    EXPEDITION_PREP_PEEKS,
} from "./constants";

type PreparedPlanet = {
    isEmpty?: boolean;
    orbitalScanned?: boolean;
    atmosphereAnalyzed?: boolean;
    drillsDone?: number;
    planetaryDrilled?: boolean;
};

/**
 * Сколько клеток сетки подсвечивает подготовка, сделанная до высадки.
 * Только для необитаемых планет: на населённых операций поверхности нет,
 * и именно этим их экспедиция должна отличаться.
 */
export function countPrepPeeks(planet: PreparedPlanet): number {
    if (!planet.isEmpty) return 0;
    const total =
        (planet.orbitalScanned ? EXPEDITION_PREP_PEEKS.orbitalScan : 0) +
        (planet.atmosphereAnalyzed
            ? EXPEDITION_PREP_PEEKS.atmosphereAnalysis
            : 0) +
        getDrillsDone(planet) * EXPEDITION_PREP_PEEKS.drillPass;
    return Math.min(EXPEDITION_PREP_PEEK_CAP, total);
}

/**
 * Помечает `count` случайных клеток как подсмотренные. `random` вынесен
 * параметром, чтобы проверка могла раздавать клетки детерминированно.
 */
export function applyPrepPeeks(
    grid: ExploreTile[],
    count: number,
    random: () => number = Math.random,
): ExploreTile[] {
    if (count <= 0) return grid;

    const remaining = grid.map((_, index) => index);
    const picked = new Set<number>();
    while (picked.size < count && remaining.length > 0) {
        const at = Math.floor(random() * remaining.length);
        picked.add(remaining.splice(at, 1)[0]);
    }

    return grid.map((tile, index) =>
        picked.has(index) ? { ...tile, peeked: true } : tile,
    );
}
