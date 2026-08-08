import { store as i18nStore } from "@/lib/useTranslation";
import { BASE_SERVICE_VALUES } from "@/game/constants/baseModules";
import { buildCrewMember } from "@/game/crew/buildCrewMember";
import { getShipCrew } from "@/game/crew/stationed";
import type { GameStore, SetState } from "@/game/types";
import { hasBaseService } from "./baseServices";

/**
 * Найм поселенца в казарме базы.
 *
 * Отличие от найма на станции — не в цене, а в том, кого дают: на базе
 * вырастают свои люди, поэтому профессию выбирает игрок, а не случай. Это и
 * есть причина строить казарму: закрыть дыру в команде, которую станции
 * упорно не предлагают.
 */
export function hireAtBase(
    outpostId: string,
    profession: string,
    set: SetState,
    get: () => GameStore,
): void {
    const state = get();
    const outpost = state.outposts.find((o) => o.id === outpostId);
    if (!outpost || !hasBaseService(outpost, "garrison")) return;

    if (state.currentLocation?.id !== outpost.locationId) {
        get().addLog(i18nStore.t("game_logs.base_service_remote"), "error");
        return;
    }
    if (state.credits < BASE_SERVICE_VALUES.settlerCost) {
        get().addLog(
            i18nStore.t("game_logs.outpost_blocked_not_enough_credits"),
            "error",
        );
        return;
    }
    if (getShipCrew(state.crew).length >= state.getCrewCapacity()) {
        get().addLog(i18nStore.t("game_logs.base_hire_no_room"), "error");
        return;
    }

    const home = state.ship.modules[0];
    if (!home) return;

    const member = buildCrewMember({
        id: Math.max(0, ...state.crew.map((c) => c.id)) + 1,
        profession: profession as never,
        moduleId: home.id,
        level: 1,
    });

    set((s) => ({
        credits: s.credits - BASE_SERVICE_VALUES.settlerCost,
        crew: [...s.crew, member],
    }));

    get().addLog(
        i18nStore.t("game_logs.base_hired", {
            name: member.name,
            profession: i18nStore.t(`professions.${member.profession}`),
        }),
        "info",
    );
    get().updateShipStats();
}
