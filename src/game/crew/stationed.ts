import type { CrewMember } from "@/game/types";

/**
 * Экипаж, физически находящийся на корабле.
 *
 * Приписанные к аванпостам остаются в `state.crew` — иначе рассыпались бы
 * прокачка, трейты и все экраны экипажа, — но для всего, что спрашивает
 * «сколько нас на борту», их нужно вычитать. Отдельный помощник, а не
 * фильтр по месту: таких мест много, и забытое означает, что человек
 * работает сразу и на аванпосте, и на корабле.
 */
export const getShipCrew = (crew: readonly CrewMember[]): CrewMember[] =>
    crew.filter((member) => !member.outpostId);

/** Экипаж, приписанный к конкретной постройке */
export const getOutpostCrew = (
    crew: readonly CrewMember[],
    outpostId: string,
): CrewMember[] => crew.filter((member) => member.outpostId === outpostId);

export const isStationed = (member: CrewMember): boolean =>
    Boolean(member.outpostId);
