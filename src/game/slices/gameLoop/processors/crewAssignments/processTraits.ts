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

        // moralePenalty: снижает (или случайно меняет) мораль самому себе каждый ход
        // number → фиксированный дрейн; [maxDrain, maxGain] → случайный диапазон
        let selfMoraleChange = 0;
        crewMember.traits?.forEach((t) => {
            const mp = t.effect?.moralePenalty;
            if (mp === undefined) return;
            if (Array.isArray(mp)) {
                const [maxDrain, maxGain] = mp;
                // случайное значение от -maxGain до +maxDrain (penalty = положительное → drain)
                const penalty = Math.floor(Math.random() * (maxDrain + maxGain + 1)) - maxGain;
                selfMoraleChange += penalty;
            } else {
                selfMoraleChange += mp;
            }
        });
        if (selfMoraleChange !== 0) {
            set((s) => ({
                crew: s.crew.map((c) =>
                    c.id === crewMember.id
                        ? { ...c, happiness: Math.max(0, Math.min(c.maxHappiness ?? 100, c.happiness - selfMoraleChange)) }
                        : c,
                ),
            }));
        }

        // teamMorale: снижает мораль всех в том же модуле (включая синтетиков)
        const teamMoralePenalty = crewMember.traits?.reduce(
            (sum, t) => sum + (t.effect?.teamMorale ? -t.effect.teamMorale : 0),
            0,
        ) ?? 0;
        if (teamMoralePenalty > 0) {
            const affectedIds = new Set(
                crew
                    .filter(
                        (c) =>
                            c.moduleId === crewMember.moduleId &&
                            c.id !== crewMember.id &&
                            RACES[c.race]?.hasHappiness !== false,
                    )
                    .map((c) => c.id),
            );
            if (affectedIds.size > 0) {
                set((s) => ({
                    crew: s.crew.map((c) =>
                        affectedIds.has(c.id)
                            ? {
                                  ...c,
                                  happiness: Math.max(
                                      0,
                                      c.happiness - teamMoralePenalty,
                                  ),
                              }
                            : c,
                    ),
                }));
            }
        }

        // shipMorale: снижает мораль всему экипажу корабля (кроме себя и синтетиков)
        const shipMoralePenalty = crewMember.traits?.reduce(
            (sum, t) => sum + (t.effect?.shipMorale ? -t.effect.shipMorale : 0),
            0,
        ) ?? 0;
        if (shipMoralePenalty > 0) {
            const shipCrewIds = new Set(
                crew
                    .filter(
                        (c) =>
                            c.id !== crewMember.id &&
                            RACES[c.race]?.hasHappiness !== false,
                    )
                    .map((c) => c.id),
            );
            if (shipCrewIds.size > 0) {
                set((s) => ({
                    crew: s.crew.map((c) =>
                        shipCrewIds.has(c.id)
                            ? {
                                  ...c,
                                  happiness: Math.max(
                                      0,
                                      c.happiness - shipMoralePenalty,
                                  ),
                              }
                            : c,
                    ),
                }));
            }
        }
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

    // Расы с alienPresencePenalty снижают настроение органикам в том же модуле каждый ход
    const alienTrait = crewRace.specialTraits.find(
        (t) => t.effects.alienPresencePenalty,
    );
    if (alienTrait) {
        const penalty = Math.abs(
            Number(alienTrait.effects.alienPresencePenalty),
        );
        const alienRaceId = crewRace.id;
        const affectedCrew = get().crew.filter(
            (c) =>
                c.moduleId === crewMember.moduleId &&
                c.race !== alienRaceId &&
                c.id !== crewMember.id &&
                RACES[c.race]?.hasHappiness !== false,
        );

        if (affectedCrew.length > 0) {
            const affectedIds = new Set(affectedCrew.map((c) => c.id));
            set((s) => ({
                crew: s.crew.map((c) =>
                    affectedIds.has(c.id)
                        ? {
                              ...c,
                              happiness: Math.max(0, c.happiness - penalty),
                          }
                        : c,
                ),
            }));
        }
    }
};
