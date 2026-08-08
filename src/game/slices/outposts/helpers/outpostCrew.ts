import {
    OUTPOST_CREW_MULTIPLIERS as MULT,
    OUTPOST_CREW_SLOTS,
    OUTPOST_ROLE,
} from "@/game/constants/outposts";
import { getBaseCrewSlots } from "@/game/constants/baseModules";
import { getOutpostCrew } from "@/game/crew/stationed";
import type { CrewMember } from "@/game/types";
import type { Outpost } from "@/game/types/outposts";

/**
 * Во сколько раз приписанный экипаж меняет добычу постройки.
 *
 * Чистая функция от людей и рода постройки: её гоняет и накопление за ход,
 * и панель, которая показывает игроку, что даст пересадка человека.
 */
export function getOutpostOutputMultiplier(
    outpost: Outpost,
    crew: readonly CrewMember[],
): number {
    const stationed = getOutpostCrew(crew, outpost.id);
    if (stationed.length === 0) return MULT.empty;

    const role = OUTPOST_ROLE[outpost.kind];
    // Берём лучшего: гарнизон работает как команда, а не как сумма
    return stationed.reduce<number>((best, member) => {
        const base = member.profession === role ? MULT.onRole : MULT.offRole;
        const withLevel =
            base + Math.max(0, (member.level ?? 1) - 1) * MULT.perLevel;
        return Math.max(best, withLevel);
    }, MULT.empty);
}

/** Сколько мест гарнизона у постройки: у базы их даёт уровень */
export function getCrewSlots(outpost: Outpost): number {
    return outpost.kind === "base"
        ? getBaseCrewSlots(outpost.level ?? 1)
        : (OUTPOST_CREW_SLOTS[outpost.kind] ?? 0);
}

/** Свободны ли ещё места гарнизона */
export function hasFreeCrewSlot(
    outpost: Outpost,
    crew: readonly CrewMember[],
): boolean {
    return getOutpostCrew(crew, outpost.id).length < getCrewSlots(outpost);
}
