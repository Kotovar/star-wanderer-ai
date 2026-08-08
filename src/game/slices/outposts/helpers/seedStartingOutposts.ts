import { RAID_GRACE_TURNS, RAID_THREAT_BY_TIER } from "@/game/constants/outpostRaids";
import type { Sector } from "@/game/types";
import type { Outpost, StartingOutpost } from "@/game/types/outposts";

/**
 * Расставляет стартовые постройки dev-шаблона по подходящим локациям.
 *
 * Локацию подбирает генерация, а не шаблон: id планет неизвестны заранее.
 * База ищет пустую планету, сборщик — газовый гигант; если подходящей нет,
 * постройка просто не появляется, а не ломает старт.
 */
export function seedStartingOutposts(
    sectors: Sector[],
    wanted: readonly StartingOutpost[] | undefined,
): { outposts: Outpost[]; sectors: Sector[] } {
    if (!wanted?.length) return { outposts: [], sectors };

    const taken = new Set<string>();
    const outposts: Outpost[] = [];

    for (const spec of wanted) {
        let placed: { sector: Sector; locationId: string } | null = null;

        for (const sector of sectors) {
            const location = sector.locations.find(
                (loc) =>
                    !taken.has(loc.id) &&
                    (spec.kind === "base"
                        ? loc.type === "planet" && loc.isEmpty
                        : loc.type === "gas_giant"),
            );
            if (location) {
                placed = { sector, locationId: location.id };
                break;
            }
        }
        if (!placed) continue;

        taken.add(placed.locationId);
        outposts.push({
            id: `dev-${spec.kind}-${placed.locationId}`,
            kind: spec.kind,
            locationId: placed.locationId,
            sectorId: placed.sector.id,
            builtAtTurn: 0,
            bunker: { ...(spec.bunker ?? {}) },
            ...(spec.kind === "base"
                ? { level: spec.level ?? 1, modules: [...(spec.modules ?? [])] }
                : {}),
            ...(spec.captured
                ? {
                      capturedAtTurn: 0,
                      raiderThreat: RAID_THREAT_BY_TIER[placed.sector.tier] ?? 1,
                  }
                : { raidGraceUntil: RAID_GRACE_TURNS }),
        });
    }

    const byLocation = new Map(outposts.map((o) => [o.locationId, o.id]));
    return {
        outposts,
        // Отметка в локации нужна значку на карте: сектор пересобирается из
        // galaxy, и без неё постройку не найти глазами
        sectors: sectors.map((sector) => ({
            ...sector,
            locations: sector.locations.map((loc) =>
                byLocation.has(loc.id)
                    ? {
                          ...loc,
                          outpostId: byLocation.get(loc.id),
                          // База требует исследованной планеты — раз она уже
                          // стоит, планета считается изученной
                          ...(loc.isEmpty ? { explored: true, orbitalScanned: true } : {}),
                      }
                    : loc,
            ),
        })),
    };
}
