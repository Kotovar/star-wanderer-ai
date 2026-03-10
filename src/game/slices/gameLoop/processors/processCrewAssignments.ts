import {
    RACES,
    CREW_ASSIGNMENT_BONUSES,
    XENOSYMBIONT_MERGE_EFFECTS,
} from "@/game/constants";
import { getMergeEffectsBonus } from "@/game/slices/crew/helpers";
import type {
    GameState,
    GameStore,
    CrewMember,
    Module,
    Race,
} from "@/game/types";

/**
 * Обработка назначений экипажа
 */
export const processCrewAssignments = (
    set: (fn: (s: GameState) => void) => void,
    get: () => GameStore,
): void => {
    get().crew.forEach((c) => {
        const crewRace = RACES[c.race];
        const currentModule = get().ship.modules.find(
            (m) => m.id === c.moduleId,
        );

        // AI Glitch check
        if (crewRace?.id === "synthetic") {
            const glitchTrait = crewRace.specialTraits.find(
                (t) => t.effects.glitchChance,
            );
            if (glitchTrait && glitchTrait.effects.glitchChance) {
                let glitchChance = Number(glitchTrait.effects.glitchChance);

                // Бонус от сращивания ксеноморфа с ai_core (-50% шанс сбоя)
                const state = get();
                const mergeBonus = getMergeEffectsBonus(
                    state.crew,
                    state.ship.modules,
                );
                if (mergeBonus.glitchResistance) {
                    glitchChance *= 1 - mergeBonus.glitchResistance / 100;
                }

                if (Math.random() < glitchChance) {
                    get().addLog(
                        `⚠️ ${c.name}: Сбой ИИ! Действие не выполнено`,
                        "warning",
                    );
                    return;
                }
            }
        }

        // Module damage check
        if (currentModule) {
            const moduleHealth = currentModule.health ?? 0;
            const medicWithFirstAid = get().crew.find(
                (cr) =>
                    cr.moduleId === c.moduleId &&
                    cr.profession === "medic" &&
                    cr.assignment === "firstaid",
            );
            const firstAidReduction = medicWithFirstAid ? 0.5 : 1;

            if (moduleHealth <= 0) {
                const moduleDamage = Math.floor(25 * firstAidReduction);
                set((s) => ({
                    crew: s.crew.map((cr) =>
                        cr.id === c.id
                            ? {
                                  ...cr,
                                  health: Math.max(0, cr.health - moduleDamage),
                              }
                            : cr,
                    ),
                }));
                get().addLog(
                    `☠️ ${c.name}: Модуль "${currentModule.name}" разрушен! -${moduleDamage} HP${medicWithFirstAid ? " (аптечки: -50% урона)" : ""}`,
                    medicWithFirstAid ? "warning" : "error",
                );
            } else if (moduleHealth < 20) {
                const moduleDamage = Math.floor(10 * firstAidReduction);
                set((s) => ({
                    crew: s.crew.map((cr) =>
                        cr.id === c.id
                            ? {
                                  ...cr,
                                  health: Math.max(0, cr.health - moduleDamage),
                              }
                            : cr,
                    ),
                }));
                get().addLog(
                    `⚠️ ${c.name}: Модуль "${currentModule.name}" критически повреждён (<20%)! -${moduleDamage} HP${medicWithFirstAid ? " (аптечки: -50% урона)" : ""}`,
                    "warning",
                );
            }
        }

        // Health regen
        let healthRegen = crewRace?.crewBonuses?.health ?? 0;
        let regenBonus = 0;
        c.traits?.forEach((trait) => {
            if (trait.effect?.regenBonus) {
                regenBonus += trait.effect.regenBonus;
            }
        });
        if (regenBonus > 0) {
            healthRegen = Math.floor(healthRegen * (1 + regenBonus));
        }
        if (healthRegen > 0 && c.assignment === "heal") {
            set((s) => ({
                crew: s.crew.map((cr) =>
                    cr.id === c.id
                        ? {
                              ...cr,
                              health: Math.min(
                                  cr.maxHealth || 100,
                                  cr.health + healthRegen,
                              ),
                          }
                        : cr,
                ),
            }));
            if (healthRegen > 0 && c.health < (c.maxHealth || 100)) {
                get().addLog(
                    `${c.name}: Регенерация +${healthRegen} HP`,
                    "info",
                );
            }
        }

        // Medical bay healing
        if (currentModule?.type === "medical" && currentModule.health > 0) {
            const hasPower =
                get().getTotalPower() > get().getTotalConsumption();
            if (hasPower) {
                const medicInModule = get().crew.find(
                    (cr) =>
                        cr.moduleId === c.moduleId && cr.profession === "medic",
                );
                let healAmount = medicInModule ? 15 : 8;

                // Бонус от сращивания ксеноморфа с medical
                const state = get();
                const mergeBonus = getMergeEffectsBonus(
                    state.crew,
                    state.ship.modules,
                );
                if (mergeBonus.healingSpeed) {
                    healAmount = Math.floor(
                        healAmount * (1 + mergeBonus.healingSpeed / 100),
                    );
                }

                set((s) => ({
                    crew: s.crew.map((cr) =>
                        cr.id === c.id
                            ? {
                                  ...cr,
                                  health: Math.min(
                                      cr.maxHealth || 100,
                                      cr.health + healAmount,
                                  ),
                              }
                            : cr,
                    ),
                }));

                if (c.health < (c.maxHealth || 100)) {
                    get().addLog(
                        `🏥 ${c.name}: Медотсек ${medicInModule ? "+доктор" : ""} +${healAmount} HP`,
                        "info",
                    );
                }
            }
        }

        // Assignment processing
        if (c.assignment) {
            processAssignment(c, currentModule, crewRace, set, get);
        }

        // Combat assignment processing
        if (c.combatAssignment) {
            processCombatAssignment(c, currentModule, crewRace, set, get);
        }

        // Negative trait effects
        processNegativeTraits(c, set, get);

        // Happiness decay
        processHappinessDecay(c, crewRace, set);

        // Alien presence penalty
        processAlienPresence(c, crewRace, set, get);
    });
};

const processAssignment = (
    c: CrewMember,
    currentModule: Module | undefined,
    crewRace: Race | undefined,
    set: (fn: (s: GameState) => void) => void,
    get: () => GameStore,
): void => {
    if (!currentModule) return;

    switch (c.assignment) {
        case "repair":
            processRepairAssignment(c, currentModule, crewRace, set, get);
            break;
        case "merge":
            processMergeAssignment(c, currentModule, crewRace, set, get);
            break;
    }
};

const processRepairAssignment = (
    c: CrewMember,
    currentModule: Module | undefined,
    crewRace: Race | undefined,
    set: (fn: (s: GameState) => void) => void,
    get: () => GameStore,
): void => {
    if (!currentModule) return;

    let repairAmount = 15;

    let taskBonus = 0;
    c.traits?.forEach((trait) => {
        if (trait.effect?.taskBonus) {
            taskBonus += trait.effect.taskBonus;
        }
        if (trait.effect?.doubleTaskEffect) {
            taskBonus = 1;
        }
    });
    if (taskBonus > 0) {
        repairAmount = Math.floor(repairAmount * (1 + taskBonus));
    }

    if (crewRace?.crewBonuses.repair) {
        repairAmount = Math.floor(
            repairAmount * (1 + crewRace.crewBonuses.repair),
        );
    }

    if (crewRace?.id === "xenosymbiont") {
        const symbiosisTrait = crewRace.specialTraits.find(
            (t) => t.effects.canMerge,
        );
        if (symbiosisTrait) {
            repairAmount = Math.floor(repairAmount * 1.1);
            get().addLog(
                `🦠 ${c.name}: Техно-симбиоз с "${currentModule.name}" (+10% ремонт)`,
                "info",
            );
        }
    }

    if (currentModule.health >= 100) {
        get().addLog(
            `${c.name}: Модуль "${currentModule.name}" полностью цел (опыт не получен)`,
            "info",
        );
        return;
    }

    set((s) => ({
        ship: {
            ...s.ship,
            modules: s.ship.modules.map((m) =>
                m.id === currentModule.id
                    ? {
                          ...m,
                          health: Math.min(100, m.health + repairAmount),
                      }
                    : m,
            ),
        },
    }));
    get().addLog(
        `${c.name}: Ремонт "${currentModule.name}" +${repairAmount}%`,
        "info",
    );
    get().gainExp(c, 8);
};

const processMergeAssignment = (
    c: CrewMember,
    currentModule: Module,
    crewRace: Race | undefined,
    set: (fn: (s: GameState) => void) => void,
    get: () => GameStore,
): void => {
    // Только ксеноморфы могут сращиваться
    if (crewRace?.id !== "xenosymbiont") {
        get().addLog(
            `${c.name}: Только ксеноморфы могут сращиваться с модулями!`,
            "warning",
        );
        return;
    }

    // Если уже сращён с этим модулем - ничего не делаем (без лога)
    if (c.isMerged && c.mergedModuleId === currentModule.id) {
        return;
    }

    // Если сращён с другим модулем - сначала отсоединяем
    if (c.isMerged && c.mergedModuleId !== null) {
        set((s) => ({
            crew: s.crew.map((cr) =>
                cr.id === c.id
                    ? {
                          ...cr,
                          isMerged: false,
                          mergedModuleId: null,
                      }
                    : cr,
            ),
        }));
        get().addLog(
            `🧬 ${c.name}: Отсоединился от предыдущего модуля`,
            "info",
        );
    }

    // Сращиваемся с текущим модулем
    set((s) => ({
        crew: s.crew.map((cr) =>
            cr.id === c.id
                ? {
                      ...cr,
                      isMerged: true,
                      mergedModuleId: currentModule.id,
                  }
                : cr,
        ),
    }));

    const mergeEffect = XENOSYMBIONT_MERGE_EFFECTS[currentModule.type];
    get().addLog(
        `🧬 ${c.name}: Сращивание с "${currentModule.name}" (${mergeEffect.name})`,
        "info",
    );
    get().gainExp(c, 10);
};

const processCombatAssignment = (
    c: CrewMember,
    currentModule: Module | undefined,
    crewRace: Race | undefined,
    set: (fn: (s: GameState) => void) => void,
    get: () => GameStore,
): void => {
    const crewInSameModule = get().crew.filter(
        (cr) => cr.moduleId === c.moduleId,
    );

    switch (c.combatAssignment) {
        case "repair":
            processCombatRepair(c, currentModule, crewRace, set, get);
            break;
        case "heal":
            processCombatHeal(c, crewInSameModule, set, get);
            break;
        case "morale":
            processCombatMorale(c, crewInSameModule, set, get);
            break;
        case "firstaid":
            if (currentModule) {
                get().addLog(
                    `${c.name}: Аптечки подготовлены (снижение урона от повреждений модуля)`,
                    "info",
                );
                get().gainExp(c, 5);
            }
            break;
        case "overclock":
            if (currentModule?.type !== "weaponbay") {
                get().addLog(
                    `${c.name}: Перегрузка неактивна - нужен в оружейной палубе!`,
                    "warning",
                );
            } else {
                set((s) => ({
                    ship: {
                        ...s.ship,
                        modules: s.ship.modules.map((m) =>
                            m.id === currentModule.id
                                ? {
                                      ...m,
                                      health: Math.max(0, m.health - 10),
                                  }
                                : m,
                        ),
                    },
                }));
                get().addLog(
                    `${c.name}: Перегрузка "${currentModule.name}" (+25% урон,-10% броня)`,
                    "warning",
                );
                get().gainExp(c, 10);
            }
            break;
        case "reactor_overload":
            if (currentModule?.type === "reactor") {
                get().addLog(
                    `${c.name}: Разгон реактора +${CREW_ASSIGNMENT_BONUSES.REACTOR_OVERLOAD}⚡`,
                    "info",
                );
                get().gainExp(c, 6);
            } else {
                get().addLog(
                    `${c.name}: Инженер должен быть в реакторе для разгона!`,
                    "warning",
                );
            }
            break;
        case "navigation":
        case "targeting":
            if (currentModule?.type !== "cockpit") {
                get().addLog(
                    `${c.name}: ${c.combatAssignment === "navigation" ? "Навигация" : "Прицеливание"} неактивн${c.combatAssignment === "navigation" ? "а" : "о"} - нужен в кабине!`,
                    "warning",
                );
            }
            break;
        case "rapidfire":
        case "calibration":
            if (currentModule?.type !== "weaponbay") {
                get().addLog(
                    `${c.name}: ${c.combatAssignment === "rapidfire" ? "Скорострельность" : "Калибровка"} неактивн${c.combatAssignment === "rapidfire" ? "а" : "а"} - нужен в оружейной палубе!`,
                    "warning",
                );
            } else {
                get().addLog(
                    `${c.name}: ${c.combatAssignment === "rapidfire" ? "Скорострельность активна (+25% урон, -5% точность)" : "Калибровка активна (+10% точность)"}`,
                    "info",
                );
                get().gainExp(c, 8);
            }
            break;
        case "patrol":
        case "research":
            get().addLog(
                `${c.name}: ${c.combatAssignment === "patrol" ? "Патрулирование" : "Исследования"}`,
                "info",
            );
            get().gainExp(c, 5);
            break;
        case "analysis":
        case "sabotage":
            get().addLog(
                `${c.name}: ${c.combatAssignment === "analysis" ? "Анализ уязвимостей врага" : "Диверсии (-5% точность врага)"}`,
                "info",
            );
            get().gainExp(c, 6);
            break;
        default:
            get().gainExp(c, 5);
    }
};

const processCombatRepair = (
    c: CrewMember,
    currentModule: Module | undefined,
    crewRace: Race | undefined,
    set: (fn: (s: GameState) => void) => void,
    get: () => GameStore,
): void => {
    if (!currentModule) return;
    let repairAmount = 15;

    let taskBonus = 0;
    c.traits?.forEach((trait) => {
        if (trait.effect?.taskBonus) {
            taskBonus += trait.effect.taskBonus;
        }
        if (trait.effect?.doubleTaskEffect) {
            taskBonus = 1;
        }
    });
    if (taskBonus > 0) {
        repairAmount = Math.floor(repairAmount * (1 + taskBonus));
    }

    if (crewRace?.crewBonuses.repair) {
        repairAmount = Math.floor(
            repairAmount * (1 + crewRace.crewBonuses.repair),
        );
    }

    if (currentModule.health >= 100) return;

    set((s) => ({
        ship: {
            ...s.ship,
            modules: s.ship.modules.map((m) =>
                m.id === currentModule.id
                    ? {
                          ...m,
                          health: Math.min(100, m.health + repairAmount),
                      }
                    : m,
            ),
        },
    }));
    get().addLog(
        `${c.name}: Экстренный ремонт "${currentModule.name}" +${repairAmount}%`,
        "combat",
    );
    get().gainExp(c, 8);
};

const processCombatHeal = (
    c: CrewMember,
    crewInSameModule: CrewMember[],
    set: (fn: (s: GameState) => void) => void,
    get: () => GameStore,
): void => {
    if (crewInSameModule.length === 0 && !c.moduleId) return;

    let healAmount = 20;
    let taskBonus = 0;
    c.traits?.forEach((trait) => {
        if (trait.effect?.taskBonus) {
            taskBonus += trait.effect.taskBonus;
        }
        if (trait.effect?.doubleTaskEffect) {
            taskBonus = 1;
        }
    });
    if (taskBonus > 0) {
        healAmount = Math.floor(healAmount * (1 + taskBonus));
    }

    const crewNeedingHealing = get().crew.filter(
        (cr) => cr.moduleId === c.moduleId && cr.health < (cr.maxHealth || 100),
    );

    if (crewNeedingHealing.length === 0) {
        get().addLog(`${c.name}: Все здоровы (опыт не получен)`, "info");
        return;
    }

    set((s) => ({
        crew: s.crew.map((cr) =>
            cr.moduleId === c.moduleId
                ? {
                      ...cr,
                      health: Math.min(
                          cr.maxHealth || 100,
                          cr.health + healAmount,
                      ),
                  }
                : cr,
        ),
    }));
    get().addLog(
        `${c.name}: Лечение модуля +${healAmount} HP (${crewNeedingHealing.length} существ)`,
        "info",
    );
    get().gainExp(c, 6 * crewNeedingHealing.length);
};

const processCombatMorale = (
    c: CrewMember,
    crewInSameModule: CrewMember[],
    set: (fn: (s: GameState) => void) => void,
    get: () => GameStore,
): void => {
    if (crewInSameModule.length === 0 && !c.moduleId) return;

    let moraleAmount = 15;
    let taskBonus = 0;
    c.traits?.forEach((trait) => {
        if (trait.effect?.taskBonus) {
            taskBonus += trait.effect.taskBonus;
        }
        if (trait.effect?.doubleTaskEffect) {
            taskBonus = 1;
        }
    });
    if (taskBonus > 0) {
        moraleAmount = Math.floor(moraleAmount * (1 + taskBonus));
    }

    const crewNeedingMorale = get().crew.filter(
        (cr) =>
            cr.moduleId === c.moduleId &&
            cr.happiness < (cr.maxHappiness || 100),
    );

    if (crewNeedingMorale.length === 0) {
        get().addLog(
            `${c.name}: Мораль максимальная (опыт не получен)`,
            "info",
        );
        return;
    }

    set((s) => ({
        crew: s.crew.map((cr) =>
            cr.moduleId === c.moduleId
                ? {
                      ...cr,
                      happiness: Math.min(
                          cr.maxHappiness || 100,
                          cr.happiness + moraleAmount,
                      ),
                  }
                : cr,
        ),
    }));
    get().addLog(
        `${c.name}: Мораль модуля +${moraleAmount} (${crewNeedingMorale.length} существ)`,
        "info",
    );
    get().gainExp(c, 4 * crewNeedingMorale.length);
};

const processNegativeTraits = (
    c: CrewMember,
    set: (fn: (s: GameState) => void) => void,
    get: () => GameStore,
): void => {
    const crewInSameModule = get().crew.filter(
        (cr) => cr.moduleId === c.moduleId && cr.id !== c.id,
    );

    c.traits?.forEach((trait) => {
        if (trait.effect?.teamMorale && crewInSameModule.length > 0) {
            const moralePenalty = Math.abs(trait.effect.teamMorale);
            set((s) => ({
                crew: s.crew.map((cr) =>
                    cr.moduleId === c.moduleId && cr.id !== c.id
                        ? {
                              ...cr,
                              happiness: Math.max(
                                  0,
                                  cr.happiness - moralePenalty,
                              ),
                          }
                        : cr,
                ),
            }));
            get().addLog(
                `⚠️ ${c.name} (${trait.name}): -${moralePenalty} настроения модулю`,
                "warning",
            );
        }
        if (trait.effect?.moralePenalty && crewInSameModule.length > 0) {
            const moralePenalty = Math.abs(trait.effect.moralePenalty);
            set((s) => ({
                crew: s.crew.map((cr) =>
                    cr.moduleId === c.moduleId && cr.id !== c.id
                        ? {
                              ...cr,
                              happiness: Math.max(
                                  0,
                                  cr.happiness - moralePenalty,
                              ),
                          }
                        : cr,
                ),
            }));
            get().addLog(
                `⚠️ ${c.name} (${trait.name}): -${moralePenalty} настроения модулю`,
                "warning",
            );
        }
    });
};

const processHappinessDecay = (
    c: CrewMember,
    crewRace: Race | undefined,
    set: (fn: (s: GameState) => void) => void,
): void => {
    const happinessBonus = crewRace?.crewBonuses?.happiness || 0;
    const hasNoHappiness = crewRace?.specialTraits?.some(
        (t) => t.id === "no_happiness",
    );

    if (hasNoHappiness) return;

    const decay = Math.floor(Math.random() * 3);
    const newHappiness = Math.max(
        0,
        Math.min(100, c.happiness - decay + Math.floor(happinessBonus / 2)),
    );
    set((s) => ({
        crew: s.crew.map((cr) =>
            cr.id === c.id
                ? {
                      ...cr,
                      happiness: newHappiness,
                  }
                : cr,
        ),
    }));
};

const processAlienPresence = (
    c: CrewMember,
    crewRace: Race | undefined,
    set: (fn: (s: GameState) => void) => void,
    get: () => GameStore,
): void => {
    if (!crewRace?.specialTraits) return;

    const penaltyTrait = crewRace.specialTraits.find(
        (t) => t.effects.alienPresencePenalty,
    );
    if (!penaltyTrait || !penaltyTrait.effects.alienPresencePenalty) return;

    const penalty = Math.abs(Number(penaltyTrait.effects.alienPresencePenalty));
    const affectedCrew = get().crew.filter(
        (cr) =>
            cr.moduleId === c.moduleId &&
            cr.race !== "synthetic" &&
            cr.race !== c.race &&
            cr.id !== c.id,
    );

    if (affectedCrew.length > 0) {
        set((s) => ({
            crew: s.crew.map((cr) =>
                cr.moduleId === c.moduleId &&
                cr.race !== "synthetic" &&
                cr.race !== c.race &&
                cr.id !== c.id
                    ? {
                          ...cr,
                          happiness: Math.max(0, cr.happiness - penalty),
                      }
                    : cr,
            ),
        }));
        affectedCrew.forEach((cr) => {
            get().addLog(
                `😰 ${cr.name}: Беспокойство от ${crewRace.name} (-${penalty} 😞)`,
                "warning",
            );
        });
    }
};
