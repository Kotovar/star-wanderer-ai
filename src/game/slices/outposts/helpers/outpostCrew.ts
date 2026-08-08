import {
    OUTPOST_CREW_MULTIPLIERS as MULT,
    OUTPOST_CREW_SLOTS,
    OUTPOST_ROLE,
} from "@/game/constants/outposts";
import { BASE_MODULES, getBaseCrewSlots } from "@/game/constants/baseModules";
import { getOutpostCrew } from "@/game/crew/stationed";
import { getBarracksSlots } from "./baseServices";
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

    const roles = getWantedRoles(outpost);
    // Берём лучшего: гарнизон работает как команда, а не как сумма
    return stationed.reduce<number>((best, member) => {
        const base = roles.has(member.profession) ? MULT.onRole : MULT.offRole;
        const withLevel =
            base + Math.max(0, (member.level ?? 1) - 1) * MULT.perLevel;
        return Math.max(best, withLevel);
    }, MULT.empty);
}

/**
 * Кого постройка хочет видеть в гарнизоне.
 *
 * У базы это зависит от того, что стоит в слотах: с лабораторией и медблоком
 * она хочет учёного и медика, а не второго инженера. Раньше профиль был один
 * на весь род постройки, и у гарнизона был единственный правильный ответ —
 * при том, что нужная профессия у каждого модуля уже была записана.
 */
export function getWantedRoles(outpost: Outpost): Set<string> {
    const roles = new Set<string>();
    if (outpost.kind === "base") {
        for (const id of outpost.modules ?? []) roles.add(BASE_MODULES[id].role);
    }
    // Профиль рода — основа: пустая база всё равно ждёт инженера
    if (roles.size === 0) roles.add(OUTPOST_ROLE[outpost.kind]);
    return roles;
}

/** Сколько мест гарнизона у постройки: у базы их даёт уровень */
export function getCrewSlots(outpost: Outpost): number {
    return outpost.kind === "base"
        ? getBaseCrewSlots(outpost.level ?? 1) + getBarracksSlots(outpost)
        : (OUTPOST_CREW_SLOTS[outpost.kind] ?? 0);
}

/** Свободны ли ещё места гарнизона */
export function hasFreeCrewSlot(
    outpost: Outpost,
    crew: readonly CrewMember[],
): boolean {
    return getOutpostCrew(crew, outpost.id).length < getCrewSlots(outpost);
}
