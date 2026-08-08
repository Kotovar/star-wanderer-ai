import { store as i18nStore } from "@/lib/useTranslation";
import { playSound } from "@/sounds";
import type { SetState, GameStore } from "@/game/types";
import { RACES } from "@/game/constants/races";
import { collectExpeditionRewards } from "./collectExpeditionRewards";
import { patchLocation } from "@/game/utils/patchLocation";
import { EXPEDITION_CREW_SCOUT_EXP, EXPEDITION_CREW_OTHER_EXP } from "./constants";

const EXPEDITION_FATIGUE_TURNS = 5;
const EXPEDITION_HAPPINESS_PENALTY = 10;

export type ExpeditionEndOutcome = "completed" | "aborted";

/**
 * Завершает или прерывает экспедицию и применяет общие последствия для экипажа.
 */
export function endExpedition(
    set: SetState,
    get: () => GameStore,
    outcome: ExpeditionEndOutcome = "completed",
): void {
    const state = get();
    const expedition = state.activeExpedition;

    if (!expedition) return;

    const completed = outcome === "completed";
    if (completed) {
        collectExpeditionRewards(expedition.rewards, set, get);
        const expeditionCrew = state.crew.filter((member) =>
            expedition.crewIds.includes(member.id),
        );
        for (const member of expeditionCrew) {
            get().gainExp(
                member,
                member.profession === "scout"
                    ? EXPEDITION_CREW_SCOUT_EXP
                    : EXPEDITION_CREW_OTHER_EXP,
            );
        }
    }

    set((s) => ({
        crew: s.crew.map((member) => {
            if (!expedition.crewIds.includes(member.id)) return member;
            const race = RACES[member.race];
            // Расы с hasFatigue:false (синтетики, порождённые пустотой) не устают
            return {
                ...member,
                expeditionFatigue: race?.hasFatigue !== false
                    ? EXPEDITION_FATIGUE_TURNS
                    : member.expeditionFatigue,
                happiness:
                    race?.hasHappiness !== false
                        ? Math.max(
                              0,
                              member.happiness - EXPEDITION_HAPPINESS_PENALTY,
                          )
                        : member.happiness,
            };
        }),
    }));

    get().addLog(
        i18nStore.t("game_logs.endExpedition_1", {
            EXPEDITION_FATIGUE_TURNS,
            EXPEDITION_HAPPINESS_PENALTY,
        }),
        "warning",
    );

    set((s) => ({
        turn: s.turn + 1,
        activeExpedition: null,
        ...(completed
            ? patchLocation(s, expedition.planetId, {
                  expeditionCompleted: true,
              })
            : {}),
    }));

    get().addLog(
        i18nStore.t(
            completed
                ? "game_logs.endExpedition_2"
                : "game_logs.abortExpedition_1",
        ),
        "info",
    );
    get().updateShipStats();
    playSound(completed ? "world_discovery" : "ui_cancel");
}

export function abortExpedition(set: SetState, get: () => GameStore): void {
    endExpedition(set, get, "aborted");
}
