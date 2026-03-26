import type { SetState } from "@/game/types";

/**
 * Уменьшает усталость экипажа от экспедиций на 1 каждый ход.
 */
export function processExpeditionFatigue(set: SetState): void {
    set((s) => {
        const hasFatigued = s.crew.some(
            (c) => c.expeditionFatigue && c.expeditionFatigue > 0,
        );
        if (!hasFatigued) return {};
        return {
            crew: s.crew.map((c) =>
                c.expeditionFatigue && c.expeditionFatigue > 0
                    ? { ...c, expeditionFatigue: c.expeditionFatigue - 1 }
                    : c,
            ),
        };
    });
}
