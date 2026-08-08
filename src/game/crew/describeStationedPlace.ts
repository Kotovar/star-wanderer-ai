import { getLocationName } from "@/lib/translationHelpers";
import type { CrewMember, Sector } from "@/game/types";
import type { Outpost } from "@/game/types/outposts";

type Translate = (key: string, params?: Record<string, string | number>) => string;

/**
 * «Газосборник · Церера-3, Меридиан-1» — где физически находится приписанный.
 *
 * Общая для карточки экипажа и подробной вкладки: обе показывали ему отсек
 * корабля, которого у него нет, и одна из них честно писала «Неизвестно».
 * Возвращает `null` для тех, кто на борту.
 */
export function describeStationedPlace(
    member: Pick<CrewMember, "outpostId">,
    outposts: readonly Outpost[],
    sectors: readonly Sector[],
    t: Translate,
): string | null {
    if (!member.outpostId) return null;

    const outpost = outposts.find((o) => o.id === member.outpostId);
    if (!outpost) return null;

    const sector = sectors.find((s) => s.id === outpost.sectorId);
    const location = sector?.locations.find((l) => l.id === outpost.locationId);
    const place = [
        getLocationName(location?.name ?? "", t),
        getLocationName(sector?.name ?? "", t),
    ]
        .filter(Boolean)
        .join(", ");

    const kind = t(`outposts.${outpost.kind}`);
    return place ? `${kind} · ${place}` : kind;
}
