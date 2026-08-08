import { store as i18nStore } from "@/lib/useTranslation";
import { BASE_EVENTS, BASE_EVENT_CHANCE } from "@/game/constants/baseEvents";
import { shiftHappiness } from "@/game/crew";
import type { GameStore, SetState } from "@/game/types";
import type { BaseEvent, OutpostResource } from "@/game/types/outposts";

const pick = (): BaseEvent => {
    const total = BASE_EVENTS.reduce((sum, e) => sum + e.weight, 0);
    let roll = Math.random() * total;
    for (const event of BASE_EVENTS) {
        roll -= event.weight;
        if (roll <= 0) return event;
    }
    return BASE_EVENTS[0];
};

/**
 * События на базе между визитами.
 *
 * Срабатывают редко и по одной постройке за ход: смысл в том, чтобы прилёт
 * иногда приносил новость, а не в том, чтобы стать вторым источником дохода.
 * Захваченная база событий не даёт — там распоряжаются не вы.
 */
export function processBaseEvents(set: SetState, get: () => GameStore): void {
    const state = get();
    const eligible = (state.outposts ?? []).filter(
        (outpost) =>
            outpost.kind === "base" && outpost.capturedAtTurn === undefined,
    );
    if (eligible.length === 0) return;

    const outpost = eligible[Math.floor(Math.random() * eligible.length)];
    if (Math.random() >= BASE_EVENT_CHANCE) return;

    const event = pick();

    set((s) => ({
        credits: s.credits + (event.credits ?? 0),
        outposts: s.outposts.map((o) =>
            o.id !== outpost.id
                ? o
                : {
                      ...o,
                      bunker: Object.entries(event.bunker ?? {}).reduce(
                          (bunker, [resource, amount]) => ({
                              ...bunker,
                              [resource]:
                                  (bunker[resource as OutpostResource] ?? 0) +
                                  amount,
                          }),
                          { ...o.bunker },
                      ),
                  },
        ),
        crew: event.morale
            ? s.crew.map((member) =>
                  member.outpostId === outpost.id
                      ? shiftHappiness(member, event.morale ?? 0)
                      : member,
              )
            : s.crew,
    }));

    get().addLog(
        i18nStore.t(`base_events.${event.id}`),
        event.morale && event.morale < 0 ? "warning" : "info",
    );
}
