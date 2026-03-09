import type { GameState, GameStore } from "@/game/types";
import { MUTATION_TRAITS } from "@/game/constants";
import { getMutationTraitDesc, getMutationTraitName } from "@/game/traits";

/**
 * Обработка проклятых артефактов
 */
export const processCursedArtifacts = (
    state: GameState,
    set: (fn: (s: GameState) => void) => void,
    get: () => GameStore,
): void => {
    const cursedArtifacts = state.artifacts.filter(
        (a) => a.cursed && a.effect.active,
    );

    cursedArtifacts.forEach((artifact) => {
        const positiveType = artifact.effect?.type;
        const positiveValue = artifact.effect?.value ?? 0;

        if (positiveType === "auto_repair" && positiveValue > 0) {
            if (state.ship.modules.length > 0) {
                const needsRepair = state.ship.modules.some(
                    (m) => m.health < (m.maxHealth || 100),
                );
                if (needsRepair) {
                    set((s) => ({
                        ship: {
                            ...s.ship,
                            modules: s.ship.modules.map((m) => ({
                                ...m,
                                health: Math.min(
                                    m.maxHealth || 100,
                                    m.health + positiveValue,
                                ),
                            })),
                        },
                    }));
                    get().addLog(
                        `✨ ${artifact.name}: Модули отремонтированы на +${positiveValue}%`,
                        "info",
                    );
                }
            }
        }

        const negativeType = artifact.negativeEffect?.type;
        const negativeValue = artifact.negativeEffect?.value || 0;

        switch (negativeType) {
            case "happiness_drain":
            case "morale_drain":
                set((s) => ({
                    crew: s.crew.map((c) => {
                        if (c.race === "synthetic") return c;
                        return {
                            ...c,
                            happiness: Math.max(0, c.happiness - negativeValue),
                        };
                    }),
                }));
                if (negativeValue > 0) {
                    get().addLog(
                        `⚠️ ${artifact.name}: -${negativeValue} ${negativeType === "happiness_drain" ? "счастья" : "морали"} экипажу`,
                        "warning",
                    );
                }
                break;

            case "module_damage":
                if (state.ship.modules.length > 0) {
                    const randomModuleIdx = Math.floor(
                        Math.random() * state.ship.modules.length,
                    );
                    const targetModule = state.ship.modules[randomModuleIdx];
                    set((s) => ({
                        ship: {
                            ...s.ship,
                            modules: s.ship.modules.map((m, i) =>
                                i === randomModuleIdx
                                    ? {
                                          ...m,
                                          health: Math.max(
                                              1,
                                              m.health - negativeValue,
                                          ),
                                      }
                                    : m,
                            ),
                        },
                    }));
                    get().addLog(
                        `⚠️ ${artifact.name}: ${targetModule.name} повреждён на -${negativeValue}%`,
                        "warning",
                    );
                }
                break;

            case "crew_desertion":
                state.crew.forEach((crewMember) => {
                    if (Math.random() * 100 < negativeValue) {
                        set((s) => ({
                            crew: s.crew.filter((c) => c.id !== crewMember.id),
                        }));
                        get().addLog(
                            `⚠️ ${artifact.name}: ${crewMember.name} покинул корабль`,
                            "warning",
                        );
                    }
                });
                break;

            case "crew_mutation":
                state.crew.forEach((crewMember) => {
                    if (Math.random() * 100 < negativeValue) {
                        const newTrait =
                            MUTATION_TRAITS[
                                Math.floor(
                                    Math.random() * MUTATION_TRAITS.length,
                                )
                            ];
                        set((s) => ({
                            crew: s.crew.map((c) =>
                                c.id === crewMember.id
                                    ? {
                                          ...c,
                                          traits: [
                                              ...c.traits,
                                              {
                                                  name: getMutationTraitName(
                                                      newTrait,
                                                  ),
                                                  desc: getMutationTraitDesc(
                                                      newTrait,
                                                  ),
                                                  effect: {},
                                                  type: "negative",
                                                  rarity: "mutation",
                                              },
                                          ],
                                      }
                                    : c,
                            ),
                        }));
                        get().addLog(
                            `⚠️ ${artifact.name}: ${crewMember.name} мутировал`,
                            "warning",
                        );
                    }
                });
                break;
        }
    });
};
