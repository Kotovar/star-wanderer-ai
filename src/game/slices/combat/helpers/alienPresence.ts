import type { GameState, GameStore } from "@/game/types";
import { RACES } from "@/game/constants/races";

/**
 * Applies alien presence morale penalty
 */
export function applyAlienPresencePenalty(
    set: (fn: (s: GameState) => void) => void,
    get: () => GameStore,
) {
    get().crew.forEach((c) => {
        const crewRace = RACES[c.race];
        const crewInSameModule = get().crew.filter(
            (cr) => cr.moduleId === c.moduleId,
        );

        if (crewRace?.specialTraits) {
            const penaltyTrait = crewRace.specialTraits.find(
                (t) => t.effects.alienPresencePenalty,
            );
            if (penaltyTrait && penaltyTrait.effects.alienPresencePenalty) {
                const penalty = Math.abs(
                    Number(penaltyTrait.effects.alienPresencePenalty),
                );
                const affectedCrew = crewInSameModule.filter(
                    (cr) =>
                        cr.race !== "synthetic" &&
                        cr.race !== c.race &&
                        cr.id !== c.id,
                );
                if (affectedCrew.length > 0) {
                    set((s) => {
                        s.crew.forEach((cr) => {
                            if (
                                cr.moduleId === c.moduleId &&
                                cr.race !== "synthetic" &&
                                cr.race !== c.race &&
                                cr.id !== c.id
                            ) {
                                cr.happiness = Math.max(
                                    0,
                                    cr.happiness - penalty,
                                );
                            }
                        });
                    });
                    affectedCrew.forEach((cr) => {
                        get().addLog(
                            `😰 ${cr.name}: Беспокойство от ${crewRace.name} (-${penalty} 😞)`,
                            "warning",
                        );
                    });
                }
            }
        }
    });
}
