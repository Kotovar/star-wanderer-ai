import { RACES } from "@/game/constants";
import type {
    CrewMember,
    GameStore,
    Module,
    Race,
    SetState,
} from "@/game/types";

/**
 * Обрабатывает негативные трейты экипажа
 * @param set - Функция обновления состояния
 * @param get - Функция получения состояния
 */
export const processNegativeTraits = (
    set: SetState,
    get: () => GameStore,
): void => {
    const crew = get().crew;

    crew.forEach((crewMember) => {
        const crewRace = RACES[crewMember.race];
        const currentModule = get().ship.modules.find(
            (m) => m.id === crewMember.moduleId,
        );

        // Обработка негативных эффектов расы
        processRaceNegativeEffects(
            crewMember,
            crewRace,
            currentModule,
            set,
            get,
        );
    });
};

/**
 * Обрабатывает негативные эффекты расы
 */
const processRaceNegativeEffects = (
    crewMember: CrewMember,
    crewRace: Race | undefined,
    currentModule: Module | undefined,
    set: SetState,
    get: () => GameStore,
): void => {
    if (!crewRace || !currentModule) return;

    // Синтетики: паранойя снижает настроение другим в модуле
    if (crewRace.id === "synthetic") {
        const paranoidTrait = crewRace.specialTraits.find(
            (t) => (t.effects as Record<string, number>).moralePenalty,
        );
        if (paranoidTrait) {
            const moralePenalty = Number(
                (paranoidTrait.effects as Record<string, number>).moralePenalty,
            );
            const crewInSameModule = get().crew.filter(
                (c) =>
                    c.moduleId === crewMember.moduleId &&
                    c.id !== crewMember.id,
            );

            if (crewInSameModule.length > 0) {
                set((s) => ({
                    crew: s.crew.map((c) =>
                        c.moduleId === crewMember.moduleId &&
                        c.id !== crewMember.id
                            ? {
                                  ...c,
                                  happiness: Math.max(
                                      0,
                                      c.happiness - moralePenalty,
                                  ),
                              }
                            : c,
                    ),
                }));
            }
        }
    }

    // Кристаллоиды: чужое присутствие снижает настроение не-кристаллоидам
    if (crewRace.id === "crystalline") {
        const alienPresenceTrait = crewRace.specialTraits.find(
            (t) => (t.effects as Record<string, number>).alienPresence,
        );
        if (alienPresenceTrait) {
            const penalty = Number(
                (alienPresenceTrait.effects as Record<string, number>)
                    .alienPresence,
            );
            const affectedCrew = get().crew.filter(
                (c) =>
                    c.moduleId === crewMember.moduleId &&
                    c.race !== "crystalline" &&
                    c.id !== crewMember.id,
            );

            if (affectedCrew.length > 0) {
                set((s) => ({
                    crew: s.crew.map((c) =>
                        c.moduleId === crewMember.moduleId &&
                        c.race !== "crystalline"
                            ? {
                                  ...c,
                                  happiness: Math.max(0, c.happiness - penalty),
                              }
                            : c,
                    ),
                }));
            }
        }
    }
};
