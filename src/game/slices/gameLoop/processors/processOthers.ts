import type { CrewTrait, GameState, GameStore } from "@/game/types";
import { CREW_TRAITS } from "@/game/constants";
import { getArtifactEffectValue } from "@/game/artifacts";

/**
 * Обработка трейтов морали
 */
export const processMoraleTraits = (
    state: GameState,
    set: (fn: (s: GameState) => void) => void,
    get: () => GameStore,
): void => {
    get().crew.forEach((c) => {
        c.traits?.forEach((trait: CrewTrait) => {
            if (!trait.effect.moduleMorale) return;

            const moraleBonus = trait.effect.moduleMorale;
            const crewInSameModule = get().crew.filter(
                (cr) =>
                    cr.moduleId === c.moduleId &&
                    cr.id !== c.id &&
                    cr.happiness < (cr.maxHappiness || 100),
            );

            if (crewInSameModule.length === 0) return;

            set((s) => ({
                crew: s.crew.map((cr) =>
                    cr.moduleId === c.moduleId && cr.id !== c.id
                        ? {
                              ...cr,
                              happiness: Math.min(
                                  cr.maxHappiness || 100,
                                  cr.happiness + moraleBonus,
                              ),
                          }
                        : cr,
                ),
            }));
            get().addLog(
                `★ ${c.name} (${trait.name}): +${moraleBonus} настроения модулю`,
                "info",
            );
        });
    });
};

/**
 * Удаление несчастного экипажа
 */
export const processUnhappyCrew = (
    state: GameState,
    set: (fn: (s: GameState) => void) => void,
    get: () => GameStore,
): void => {
    const unhappyCrew = get().crew.filter((c) => c.happiness === 0);
    unhappyCrew.forEach((c) => {
        get().addLog(`${c.name} покинул корабль!`, "error");
        set((s) => ({ crew: s.crew.filter((cr) => cr.id !== c.id) }));
    });
};

/**
 * Проверка критической нехватки энергии
 */
export const processPowerCheck = (
    state: GameState,
    set: (fn: (s: GameState) => void) => void,
    get: () => GameStore,
): void => {
    const power = get().getTotalPower();
    const boost = get().crew.find((c) => c.assignment === "power") ? 5 : 0;
    const consumption = get().getTotalConsumption();
    const available = power + boost - consumption;

    if (available >= 0) return;

    get().addLog("КРИТИЧНО: Недостаток энергии!", "error");
    set((s) => ({
        crew: s.crew.map((c) => ({
            ...c,
            happiness: Math.max(0, c.happiness - 10),
        })),
    }));

    if (Math.random() < 0.4) {
        const mod =
            get().ship.modules[
                Math.floor(Math.random() * get().ship.modules.length)
            ];
        set((s) => ({
            ship: {
                ...s.ship,
                modules: s.ship.modules.map((m) =>
                    m.id === mod.id
                        ? {
                              ...m,
                              health: Math.max(0, m.health - 15),
                          }
                        : m,
                ),
            },
        }));
        get().addLog(`"${mod.name}" повреждён перегрузкой!`, "error");
    }
};

/**
 * Проверка критической нехватки кислорода
 */
export const processOxygenCheck = (
    state: GameState,
    set: (fn: (s: GameState) => void) => void,
    get: () => GameStore,
): void => {
    if (get().crew.length <= get().getCrewCapacity()) return;

    get().addLog("КРИТИЧНО: Недостаток кислорода!", "error");
    set((s) => ({
        crew: s.crew.map((c) => ({
            ...c,
            health: Math.max(0, c.health - 20),
        })),
    }));
};

/**
 * Эффекты проклятых артефактов
 */
export const processCursedArtifactEffects = (
    state: GameState,
    set: (fn: (s: GameState) => void) => void,
    get: () => GameStore,
): void => {
    const activeCursedArtifacts = state.artifacts.filter(
        (a) => a.cursed && a.effect.active,
    );

    activeCursedArtifacts.forEach((artifact) => {
        if (!artifact.negativeEffect) return;

        switch (artifact.negativeEffect.type) {
            case "happiness_drain": {
                const drain = artifact.negativeEffect.value || 5;
                set((s) => ({
                    crew: s.crew.map((c) => {
                        if (c.race === "synthetic") return c;
                        return {
                            ...c,
                            happiness: Math.max(0, c.happiness - drain),
                        };
                    }),
                }));
                get().addLog(
                    `⚛️ ${artifact.name}: -${drain} счастья`,
                    "warning",
                );
                break;
            }
            case "morale_drain": {
                const drain = artifact.negativeEffect.value || 3;
                set((s) => ({
                    crew: s.crew.map((c) => {
                        if (c.race === "synthetic") return c;
                        return {
                            ...c,
                            happiness: Math.max(0, c.happiness - drain),
                        };
                    }),
                }));
                get().addLog(
                    `🛡️ ${artifact.name}: команда чувствует холод`,
                    "warning",
                );
                break;
            }
            case "module_damage": {
                const dmg = artifact.negativeEffect.value || 10;
                const activeMods = state.ship.modules.filter(
                    (m) => m.health > 10,
                );
                if (activeMods.length > 0) {
                    const randomMod =
                        activeMods[
                            Math.floor(Math.random() * activeMods.length)
                        ];
                    set((s) => ({
                        ship: {
                            ...s.ship,
                            modules: s.ship.modules.map((m) =>
                                m.id === randomMod.id
                                    ? {
                                          ...m,
                                          health: Math.max(10, m.health - dmg),
                                      }
                                    : m,
                            ),
                        },
                    }));
                    get().addLog(
                        `📦 ${artifact.name}: "${randomMod.name}" повреждён`,
                        "warning",
                    );
                }
                break;
            }
            case "crew_desertion": {
                const chance = (artifact.negativeEffect.value || 5) / 100;
                if (Math.random() < chance && state.crew.length > 1) {
                    const leavingIdx = Math.floor(
                        Math.random() * state.crew.length,
                    );
                    const leaving = state.crew[leavingIdx];
                    set((s) => ({
                        crew: s.crew.filter((_, i) => i !== leavingIdx),
                    }));
                    get().addLog(
                        `🔧 ${artifact.name}: ${leaving.name} покинул корабль!`,
                        "error",
                    );
                }
                break;
            }
            case "crew_mutation": {
                const mutationChance =
                    (artifact.negativeEffect.value || 15) / 100;
                const mutations = CREW_TRAITS.mutation;
                let mutated = false;

                state.crew.forEach((c) => {
                    if (
                        Math.random() < mutationChance &&
                        !c.traits.some((t: CrewTrait) =>
                            t.name.startsWith("Мутация:"),
                        )
                    ) {
                        const mutation =
                            mutations[
                                Math.floor(Math.random() * mutations.length)
                            ];
                        set((s) => ({
                            crew: s.crew.map((crew) =>
                                crew.id === c.id
                                    ? {
                                          ...crew,
                                          traits: [
                                              ...crew.traits,
                                              {
                                                  name: mutation.name,
                                                  desc: mutation.desc,
                                                  effect: mutation.effect as unknown as Record<
                                                      string,
                                                      number
                                                  >,
                                                  type: "neutral" as const,
                                              },
                                          ],
                                      }
                                    : crew,
                            ),
                        }));
                        get().addLog(
                            `🧬 ${artifact.name}: ${c.name} мутировал! ${mutation.name}`,
                            "warning",
                        );
                        mutated = true;
                    }
                });

                if (!mutated && Math.random() < 0.3) {
                    get().addLog(
                        `🧬 ${artifact.name}: ДНК экипажа стабилен... пока`,
                        "info",
                    );
                }
                break;
            }
            case "health_drain": {
                const drain = artifact.negativeEffect.value || 5;
                const immortalArtifact = state.artifacts.find(
                    (a) => a.effect.type === "crew_immortal" && a.effect.active,
                );
                const undyingArtifact = state.artifacts.find(
                    (a) => a.effect.type === "undying_crew" && a.effect.active,
                );

                set((s) => ({
                    crew: s.crew.map((c) => ({
                        ...c,
                        health: Math.max(
                            immortalArtifact || undyingArtifact ? 1 : 0,
                            c.health - drain,
                        ),
                    })),
                }));
                get().addLog(
                    `🌀 ${artifact.name}: -${drain} здоровья экипажу`,
                    "warning",
                );
                break;
            }
        }
    });
};

/**
 * Бонусы артефактов (авто-ремонт, реактор бездны)
 */
export const processArtifactBonuses = (
    state: GameState,
    set: (fn: (s: GameState) => void) => void,
    get: () => GameStore,
): void => {
    const autoRepair = state.artifacts.find(
        (a) => a.effect.type === "auto_repair" && a.effect.active,
    );
    if (autoRepair) {
        const repairAmount = getArtifactEffectValue(autoRepair, state);
        set((s) => ({
            ship: {
                ...s.ship,
                modules: s.ship.modules.map((m) => ({
                    ...m,
                    health: Math.min(100, m.health + repairAmount),
                })),
            },
        }));
        get().addLog(
            `🔧 Паразитические Наниты: ремонт +${repairAmount}%`,
            "info",
        );
    }

    const abyssReactor = state.artifacts.find(
        (a) => a.effect.type === "abyss_power" && a.effect.active,
    );
    if (abyssReactor) {
        get().addLog(
            `⚛️ Реактор Бездны: +${abyssReactor.effect.value || 15}⚡`,
            "info",
        );
    }
};
