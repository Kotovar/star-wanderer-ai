import { store as i18nStore } from "@/lib/useTranslation";
import type { GameStore, SetState } from "@/game/types";
import type { Outpost } from "@/game/types/outposts";

/** Идут ли на постройке работы */
export const isUnderConstruction = (outpost: Outpost | undefined): boolean =>
    outpost?.readyAtTurn !== undefined;

/** Сколько ходов ещё ждать */
export const turnsUntilReady = (outpost: Outpost, turn: number): number =>
    Math.max(0, (outpost.readyAtTurn ?? turn) - turn);

/**
 * Новый срок окончания работ.
 *
 * Работы складываются, а не отменяют друг друга: заказать модуль поверх
 * недостроенной базы можно, но бригада одна и очередь общая.
 */
export const scheduleWork = (
    outpost: Outpost,
    turn: number,
    turns: number,
): number => Math.max(turn, outpost.readyAtTurn ?? turn) + turns;

/**
 * Тик стройки: снимает отметку с достроенного и сообщает об этом.
 *
 * Сообщать обязательно — работы идут, пока игрок летает где-то ещё, и
 * «база заработала» иначе пришлось бы замечать самому.
 */
export function processConstruction(set: SetState, get: () => GameStore): void {
    const state = get();
    const done = (state.outposts ?? []).filter(
        (outpost) =>
            outpost.readyAtTurn !== undefined &&
            state.turn >= outpost.readyAtTurn,
    );
    if (done.length === 0) return;

    const readyIds = new Set(done.map((o) => o.id));
    set((s) => ({
        outposts: s.outposts.map((o) =>
            readyIds.has(o.id) ? { ...o, readyAtTurn: undefined } : o,
        ),
    }));

    for (const outpost of done) {
        get().addLog(
            i18nStore.t(
                outpost.kind === "base"
                    ? "game_logs.outpost_work_done_base"
                    : "game_logs.outpost_work_done",
            ),
            "info",
        );
    }
}
