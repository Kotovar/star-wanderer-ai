import { RACES } from "@/game/constants/races";
import { isAffectedByAlienPresence } from "@/game/slices/crew";
import type { CrewMember, GameState, GameStore } from "@/game/types";

/**
 * Применяет штраф за моральный дух, связанный с присутствием инопланетян.
 */
export function applyAlienPresencePenalty(
    set: (fn: (s: GameState) => void) => void,
    get: () => GameStore,
) {
    const store = get();

    const crewByModule = new Map<number, CrewMember[]>();

    store.crew.forEach((crew) => {
        if (!crewByModule.has(crew.moduleId)) {
            crewByModule.set(crew.moduleId, []);
        }

        const crewMembers = crewByModule.get(crew.moduleId);
        crewMembers?.push(crew);
    });

    const penalties = new Map<number, number>();

    store.crew.forEach((c) => {
        const race = RACES[c.race];

        const penaltyTrait = race?.specialTraits?.find(
            (t) => t.effects.alienPresencePenalty,
        );

        if (!penaltyTrait?.effects.alienPresencePenalty) return;

        const penalty = Math.abs(
            Number(penaltyTrait.effects.alienPresencePenalty),
        );

        const crewInModule = crewByModule.get(c.moduleId) ?? [];

        crewInModule.forEach((target) => {
            if (!isAffectedByAlienPresence(target, c)) return;

            penalties.set(target.id, (penalties.get(target.id) ?? 0) + penalty);

            store.addLog(
                `😰 ${target.name}: Беспокойство от ${race.name} (-${penalty} 😞)`,
                "warning",
            );
        });

        if (penalties.size === 0) return;

        set((s) => {
            s.crew.forEach((cr) => {
                const penaltyCrew = penalties.get(cr.id);
                if (!penaltyCrew) return;

                cr.happiness = Math.max(0, cr.happiness - penaltyCrew);
            });
        });
    });
}
