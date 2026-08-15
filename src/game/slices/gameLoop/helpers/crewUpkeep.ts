import { store as i18nStore } from "@/lib/useTranslation";
import { getCrewUpkeep, settleUpkeep, UPKEEP_INTERVAL } from "@/game/crew/upkeep";
import type { GameStore, SetState } from "@/game/types";

/**
 * Выплата жалованья экипажу раз в UPKEEP_INTERVAL ходов.
 *
 * Ход перестаёт быть бесплатным: ожидание на месте больше не чинит корабль
 * и не качает науку даром. Расчёт живёт в `crew/upkeep.ts`, здесь только
 * запись в состояние и лог — итог игрок увидит модалкой.
 */
export const processCrewUpkeep = (
    set: SetState,
    get: () => GameStore,
): void => {
    const state = get();
    if (state.turn % UPKEEP_INTERVAL !== 0) return;
    if (getCrewUpkeep(state.crew) <= 0) return;

    const { crew, report } = settleUpkeep(state.crew, state.credits, state.turn);

    set(() => ({
        credits: report.creditsLeft,
        crew,
        pendingUpkeepReport: report,
    }));

    const fullyPaid = report.paid >= report.due;
    get().addLog(
        fullyPaid
            ? i18nStore.t("game_logs.crew_upkeep_paid", {
                  due: report.due,
                  count: state.crew.length,
              })
            : i18nStore.t("game_logs.crew_upkeep_unpaid", {
                  paid: report.paid,
                  due: report.due,
              }),
        fullyPaid ? "info" : "warning",
    );
};
