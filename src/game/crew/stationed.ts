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

/**
 * Живой экипаж на борту — те, по кому вообще может ударить потурновый эффект
 * корабля. Трупу нечего терять в морали, а человек на аванпосте находится за
 * несколько секторов отсюда и не должен ни мутировать, ни дезертировать
 * из-за артефакта, лежащего в трюме.
 */
export const isWorkingCrew = (
    member: Pick<CrewMember, "health" | "outpostId">,
): boolean => !member.outpostId && member.health > 0;

export const getLivingShipCrew = (crew: readonly CrewMember[]): CrewMember[] =>
    crew.filter(isWorkingCrew);

/** Экипаж, приписанный к конкретной постройке */
export const getOutpostCrew = (
    crew: readonly CrewMember[],
    outpostId: string,
): CrewMember[] => crew.filter((member) => member.outpostId === outpostId);

export const isStationed = (member: CrewMember): boolean =>
    Boolean(member.outpostId);
