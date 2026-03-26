import type { SetState, GameStore } from "@/game/types";
import { RACES } from "@/game/constants/races";
import { collectExpeditionRewards } from "./collectExpeditionRewards";
import { EXPEDITION_CREW_SCOUT_EXP, EXPEDITION_CREW_OTHER_EXP } from "./constants";

const EXPEDITION_FATIGUE_TURNS = 5;
const EXPEDITION_HAPPINESS_PENALTY = 10;

/**
 * Завершает экспедицию: применяет награды, опыт, усталость экипажу, тратит 1 ход.
 * Помечает планету как исследованную (1 экспедиция за всю игру).
 */
export function endExpedition(set: SetState, get: () => GameStore): void {
    const state = get();
    const expedition = state.activeExpedition;

    if (!expedition) return;

    // Apply collected rewards
    collectExpeditionRewards(expedition.rewards, set, get);

    // Give experience + apply fatigue + happiness penalty to expedition crew
    const expeditionCrew = state.crew.filter((c) =>
        expedition.crewIds.includes(c.id),
    );
    for (const member of expeditionCrew) {
        const exp =
            member.profession === "scout"
                ? EXPEDITION_CREW_SCOUT_EXP
                : EXPEDITION_CREW_OTHER_EXP;
        get().gainExp(member, exp);
    }

    // Apply fatigue and happiness penalty
    set((s) => ({
        crew: s.crew.map((c) => {
            if (!expedition.crewIds.includes(c.id)) return c;
            const race = RACES[c.race];
            const hasHappiness = race?.hasHappiness !== false;
            return {
                ...c,
                expeditionFatigue: EXPEDITION_FATIGUE_TURNS,
                happiness: hasHappiness
                    ? Math.max(0, c.happiness - EXPEDITION_HAPPINESS_PENALTY)
                    : c.happiness,
            };
        }),
    }));

    get().addLog(
        `😴 Участники экспедиции устали: ${EXPEDITION_FATIGUE_TURNS} ходов отдыха, -${EXPEDITION_HAPPINESS_PENALTY} морали.`,
        "warning",
    );

    // Mark planet as expedition completed (once per planet)
    const planetId = expedition.planetId;
    set((s) => ({
        turn: s.turn + 1,
        activeExpedition: null,
        currentSector: s.currentSector
            ? {
                  ...s.currentSector,
                  locations: s.currentSector.locations.map((l) =>
                      l.id === planetId ? { ...l, expeditionCompleted: true } : l,
                  ),
              }
            : s.currentSector,
        currentLocation:
            s.currentLocation?.id === planetId
                ? { ...s.currentLocation, expeditionCompleted: true }
                : s.currentLocation,
    }));

    get().addLog("🗺️ Экспедиция завершена.", "info");
    get().updateShipStats();
}
