import type { CrewMember, GameStore, SetState } from "@/game/types";

/**
 * Опыт за работу в бою — один раз за бой на человека.
 *
 * Раунд боя ходов не стоит: кампанейские ходы списываются один раз на выходе
 * (applyCombatTimeCost, 1–3 хода за весь бой). Пока опыт капал каждый раунд,
 * затяжной бой со слабым противником был самой дешёвой прокачкой в игре —
 * дешевле любого назначения, которое честно съедает ход.
 *
 * Возвращает true, если опыт начислен.
 */
export const grantCombatExpOnce = (
    crewMember: CrewMember,
    amount: number,
    set: SetState,
    get: () => GameStore,
): boolean => {
    if (!get().currentCombat) return false;
    if (get().currentCombat?.assignmentExpCrewIds?.includes(crewMember.id)) {
        return false;
    }

    set((s) =>
        s.currentCombat
            ? {
                  currentCombat: {
                      ...s.currentCombat,
                      assignmentExpCrewIds: [
                          ...(s.currentCombat.assignmentExpCrewIds ?? []),
                          crewMember.id,
                      ],
                  },
              }
            : {},
    );
    get().gainExp(crewMember, amount);
    return true;
};
