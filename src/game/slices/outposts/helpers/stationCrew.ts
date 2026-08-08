import { store as i18nStore } from "@/lib/useTranslation";
import { getOutpostCrew } from "@/game/crew/stationed";
import type { GameStore, SetState } from "@/game/types";
import { hasFreeCrewSlot } from "./outpostCrew";

/**
 * Приписка человека к постройке.
 *
 * Приписанный снимается с модуля и с назначений намеренно: бой, урон по
 * отсекам и обработка назначений ищут людей по `moduleId`, и человек, забывший
 * отвязаться, работал бы одновременно на аванпосте и на корабле. Прежний
 * модуль запоминается, чтобы вернуть его на место.
 */
export function stationCrew(
    crewId: number,
    outpostId: string,
    set: SetState,
    get: () => GameStore,
): void {
    const state = get();
    const outpost = state.outposts.find((o) => o.id === outpostId);
    const member = state.crew.find((c) => c.id === crewId);
    if (!outpost || !member) return;

    if (state.currentLocation?.id !== outpost.locationId) {
        get().addLog(i18nStore.t("game_logs.outpost_crew_remote"), "error");
        return;
    }
    if (member.outpostId) return;
    if (!hasFreeCrewSlot(outpost, state.crew)) {
        get().addLog(i18nStore.t("game_logs.outpost_crew_no_slot"), "error");
        return;
    }

    set((s) => ({
        crew: s.crew.map((c) =>
            c.id !== crewId
                ? c
                : {
                      ...c,
                      outpostId,
                      stationedFromModuleId: c.moduleId,
                      moduleId: 0,
                      assignment: null,
                      assignmentEffect: null,
                      combatAssignment: null,
                      combatAssignmentEffect: null,
                  },
        ),
    }));

    get().addLog(
        i18nStore.t("game_logs.outpost_crew_stationed", { name: member.name }),
        "info",
    );
    get().updateShipStats();
}

/** Возврат человека на корабль. Только находясь у постройки */
export function recallCrew(
    crewId: number,
    set: SetState,
    get: () => GameStore,
): void {
    const state = get();
    const member = state.crew.find((c) => c.id === crewId);
    if (!member?.outpostId) return;

    const outpost = state.outposts.find((o) => o.id === member.outpostId);
    if (outpost && state.currentLocation?.id !== outpost.locationId) {
        get().addLog(i18nStore.t("game_logs.outpost_crew_remote"), "error");
        return;
    }

    // Прежний отсек мог быть снесён или занят — тогда берём любой уцелевший
    const previous = state.ship.modules.find(
        (m) => m.id === member.stationedFromModuleId,
    );
    const fallback = state.ship.modules[0];
    const target = previous ?? fallback;
    if (!target) {
        get().addLog(i18nStore.t("game_logs.outpost_crew_no_module"), "error");
        return;
    }

    set((s) => ({
        crew: s.crew.map((c) =>
            c.id !== crewId
                ? c
                : {
                      ...c,
                      outpostId: undefined,
                      stationedFromModuleId: undefined,
                      moduleId: target.id,
                  },
        ),
    }));

    get().addLog(
        i18nStore.t("game_logs.outpost_crew_recalled", { name: member.name }),
        "info",
    );
    get().updateShipStats();
}

/** Сколько людей стоит на постройке — для панели */
export const getStationedCount = (
    state: Pick<GameStore, "crew">,
    outpostId: string,
): number => getOutpostCrew(state.crew, outpostId).length;
