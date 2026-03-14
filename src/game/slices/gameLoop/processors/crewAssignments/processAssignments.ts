import { RACES, XENOSYMBIONT_MERGE_EFFECTS } from "@/game/constants";
import {
    getMergeEffectsBonus,
    calculateHealthRegen,
} from "@/game/slices/crew/helpers";
import {
    ASSIGNMENT_BASES,
    ASSIGNMENT_MULTIPLIERS,
    BASE_EXP_REWARDS,
} from "./constants";
import { processCombatAssignment } from "./processCombatAssignments";
import type {
    GameState,
    GameStore,
    CrewMember,
    Module,
    Race,
    SetState,
} from "@/game/types";
import { getActiveModules, isModuleActive } from "@/game/modules/utils";

/**
 * Обрабатывает все назначения экипажа
 * Вызывается каждый ход для каждого члена экипажа
 * @param set - Функция обновления состояния
 * @param get - Функция получения состояния
 */
export const processCrewAssignments = (
    set: SetState,
    get: () => GameStore,
): void => {
    const crew = get().crew;

    // === ПАССИВНАЯ РЕГЕНЕРАЦИЯ ЗДОРОВЬЯ ===
    // Применяется ко всему живому экипажу в начале хода
    processPassiveHealthRegen(set, get);

    crew.forEach((crewMember) => {
        const crewRace = RACES[crewMember.race];
        const currentModule = get().ship.modules.find(
            (m) => m.id === crewMember.moduleId,
        );

        // Проверка на сбой ИИ для синтетиков
        if (
            crewRace.id === "synthetic" &&
            !checkAiGlitch(crewMember, crewRace, get(), get)
        ) {
            return;
        }

        // Обработка вне-боевых назначений
        if (!get().currentCombat && crewMember.assignment) {
            processNonCombatAssignment(
                crewMember,
                currentModule,
                crewRace,
                set,
                get,
            );
        }

        // Обработка боевых назначений
        if (get().currentCombat && crewMember.combatAssignment) {
            processCombatAssignment(
                crewMember,
                currentModule,
                crewRace,
                set,
                get,
            );
        }
    });
};

/**
 * Проверяет шанс сбоя ИИ для синтетиков
 * @returns true если сбой произошёл (действие отменено)
 */
const checkAiGlitch = (
    crewMember: CrewMember,
    crewRace: Race,
    state: GameState,
    get: () => GameStore,
): boolean => {
    const glitchTrait = crewRace.specialTraits.find(
        (t) => t.effects.glitchChance,
    );
    if (!glitchTrait?.effects.glitchChance) return false;

    let glitchChance = Number(glitchTrait.effects.glitchChance);

    // Бонус от сращивания ксеноморфа с ai_core (-50% шанс сбоя)
    const mergeBonus = getMergeEffectsBonus(state.crew, state.ship.modules);
    if (mergeBonus.glitchResistance) {
        glitchChance *= 1 - mergeBonus.glitchResistance / 100;
    }

    if (Math.random() < glitchChance) {
        get().addLog(
            `⚠️ ${crewMember.name}: Сбой ИИ! Действие не выполнено`,
            "warning",
        );
        return false;
    }

    return true;
};

/**
 * Обрабатывает вне-боевые назначения
 */
const processNonCombatAssignment = (
    crewMember: CrewMember,
    currentModule: Module | undefined,
    crewRace: Race | undefined,
    set: SetState,
    get: () => GameStore,
): void => {
    if (!currentModule) return;

    switch (crewMember.assignment) {
        case "repair":
            processRepairAssignment(
                crewMember,
                currentModule,
                crewRace,
                set,
                get,
            );
            break;
        case "merge":
            processMergeAssignment(
                crewMember,
                currentModule,
                crewRace,
                set,
                get,
            );
            break;
        case "reactor_overload":
            processPowerAssignment(crewMember, currentModule, set, get);
            break;
        case "navigation":
            processNavigationAssignment(crewMember, currentModule, set, get);
            break;
        case "evasion":
            processEvasionAssignment(crewMember, currentModule, set, get);
            break;
        case "heal":
            processHealAssignment(
                crewMember,
                currentModule,
                crewRace,
                set,
                get,
            );
            break;
        case "morale":
            processMoraleAssignment(
                crewMember,
                currentModule,
                crewRace,
                set,
                get,
            );
            break;
        case "research":
            processResearchAssignment(crewMember, currentModule, get);
            break;
    }
};

/**
 * Ремонт модуля
 */
const processRepairAssignment = (
    crewMember: CrewMember,
    currentModule: Module,
    crewRace: Race | undefined,
    set: SetState,
    get: () => GameStore,
): void => {
    let repairAmount: number = ASSIGNMENT_BASES.REPAIR_AMOUNT;

    // Бонус от трейтов
    let taskBonus = 0;
    crewMember.traits?.forEach((trait) => {
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

    // Расовый бонус
    if (crewRace?.crewBonuses.repair) {
        repairAmount = Math.floor(
            repairAmount * (1 + crewRace.crewBonuses.repair),
        );
    }

    const maxHealth =
        currentModule.maxHealth || ASSIGNMENT_MULTIPLIERS.MAX_HEALTH;

    if (currentModule.health >= maxHealth) {
        get().addLog(
            `${crewMember.name}: Модуль "${currentModule.name}" полностью цел`,
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
                          health: Math.min(maxHealth, m.health + repairAmount),
                      }
                    : m,
            ),
        },
    }));
    get().addLog(
        `${crewMember.name}: Ремонт "${currentModule.name}" +${repairAmount}%`,
        "info",
    );
    get().gainExp(crewMember, BASE_EXP_REWARDS.REPAIR);
};

/**
 * Сращивание ксеноморфа с модулем
 */
const processMergeAssignment = (
    crewMember: CrewMember,
    currentModule: Module,
    crewRace: Race | undefined,
    set: SetState,
    get: () => GameStore,
): void => {
    if (crewRace?.id !== "xenosymbiont") return;

    const mergeEffect = XENOSYMBIONT_MERGE_EFFECTS[currentModule.type];
    if (!mergeEffect) return;

    set((s) => ({
        crew: s.crew.map((c) =>
            c.id === crewMember.id
                ? { ...c, isMerged: true, mergedModuleId: currentModule.id }
                : c,
        ),
    }));

    get().addLog(
        `🧬 ${crewMember.name}: Сращивание с "${currentModule.name}"`,
        "info",
    );
};

/**
 * Назначение на энергию (+5 к генерации)
 * Работает только в реакторе
 */
const processPowerAssignment = (
    crewMember: CrewMember,
    currentModule: Module,
    set: SetState,
    get: () => GameStore,
): void => {
    // Проверяем что экипаж в реакторе
    if (currentModule.type !== "reactor") {
        get().addLog(
            `${crewMember.name}: Разгон реактора возможен только в реакторе`,
            "warning",
        );
        return;
    }

    set((s) => ({
        ship: {
            ...s.ship,
            bonusPower: (s.ship.bonusPower ?? 0) + ASSIGNMENT_BASES.POWER_BONUS,
        },
    }));
    get().addLog(
        `⚡ ${crewMember.name}: Разгон реактора +${ASSIGNMENT_BASES.POWER_BONUS}⚡`,
        "info",
    );
    get().gainExp(crewMember, BASE_EXP_REWARDS.POWER);
};

/**
 * Назначение на навигацию (-1 к потреблению)
 * Работает только в двигателе
 */
const processNavigationAssignment = (
    crewMember: CrewMember,
    currentModule: Module,
    set: SetState,
    get: () => GameStore,
): void => {
    // Проверяем что экипаж в двигателе
    if (currentModule.type !== "engine") {
        get().addLog(
            `${crewMember.name}: Навигация возможна только в двигателе`,
            "warning",
        );
        return;
    }

    set((s) => ({
        ship: {
            ...s.ship,
            bonusPower:
                (s.ship.bonusPower || 0) +
                ASSIGNMENT_BASES.NAVIGATION_CONSUMPTION,
        },
    }));
    get().addLog(`🧭 ${crewMember.name}: Навигация -1⚡ потребление`, "info");
    get().gainExp(crewMember, BASE_EXP_REWARDS.NAVIGATION);
};

/**
 * Назначение на уклонение (+3%)
 * Работает только в двигателе
 */
const processEvasionAssignment = (
    crewMember: CrewMember,
    currentModule: Module,
    set: SetState,
    get: () => GameStore,
): void => {
    // Проверяем что экипаж в двигателе
    if (currentModule.type !== "engine") {
        get().addLog(
            `${crewMember.name}: Манёвры возможны только в двигателе`,
            "warning",
        );
        return;
    }

    set((s) => ({
        ship: {
            ...s.ship,
            bonusEvasion:
                (s.ship.bonusEvasion ?? 0) + ASSIGNMENT_BASES.EVADE_BONUS,
        },
    }));
    get().addLog(
        `💨 ${crewMember.name}: Манёвры +${ASSIGNMENT_BASES.EVADE_BONUS}% уклонение`,
        "info",
    );
    get().gainExp(crewMember, BASE_EXP_REWARDS.EVADE);
};

/**
 * Лечение экипажа
 * Работает в любом модуле - лечит экипаж в том же модуле
 */
const processHealAssignment = (
    crewMember: CrewMember,
    currentModule: Module,
    crewRace: Race | undefined,
    set: SetState,
    get: () => GameStore,
): void => {
    let healAmount: number = ASSIGNMENT_BASES.HEAL_AMOUNT;

    // Бонус от трейтов
    let taskBonus = 0;
    crewMember.traits?.forEach((trait) => {
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

    // Расовый бонус
    if (crewRace?.crewBonuses.health) {
        healAmount = Math.floor(healAmount * (1 + crewRace.crewBonuses.health));
    }

    const crewToHeal = get().crew.filter(
        (c) =>
            c.moduleId === currentModule.id &&
            c.health < (c.maxHealth || ASSIGNMENT_MULTIPLIERS.MAX_HEALTH),
    );

    if (crewToHeal.length === 0) {
        get().addLog(`${crewMember.name}: Все здоровы`, "info");
        return;
    }

    set((s) => ({
        crew: s.crew.map((c) =>
            c.moduleId === currentModule.id
                ? {
                      ...c,
                      health: Math.min(
                          c.maxHealth || ASSIGNMENT_MULTIPLIERS.MAX_HEALTH,
                          c.health + healAmount,
                      ),
                  }
                : c,
        ),
    }));

    get().addLog(
        `💉 ${crewMember.name}: Лечение экипажа +${healAmount}❤️`,
        "info",
    );
    get().gainExp(crewMember, BASE_EXP_REWARDS.HEAL);
};

/**
 * Поднятие настроения
 * Работает в любом модуле - поднимает настроение экипажу в том же модуле
 */
const processMoraleAssignment = (
    crewMember: CrewMember,
    currentModule: Module,
    crewRace: Race | undefined,
    set: SetState,
    get: () => GameStore,
): void => {
    let moraleAmount: number = ASSIGNMENT_BASES.MORALE_AMOUNT;

    // Бонус от трейтов
    let taskBonus = 0;
    crewMember.traits?.forEach((trait) => {
        if (trait.effect?.taskBonus) {
            taskBonus += trait.effect.taskBonus;
        }
    });
    if (taskBonus > 0) {
        moraleAmount = Math.floor(moraleAmount * (1 + taskBonus));
    }

    // Расовый бонус
    if (crewRace?.crewBonuses.happiness) {
        moraleAmount = Math.floor(
            moraleAmount * (1 + crewRace.crewBonuses.happiness),
        );
    }

    const crewToHelp = get().crew.filter(
        (c) =>
            c.moduleId === currentModule.id &&
            c.happiness < ASSIGNMENT_MULTIPLIERS.MAX_HAPPINESS,
    );

    if (crewToHelp.length === 0) {
        get().addLog(`${crewMember.name}: Настроение в порядке`, "info");
        return;
    }

    set((s) => ({
        crew: s.crew.map((c) =>
            c.moduleId === currentModule.id
                ? {
                      ...c,
                      happiness: Math.min(
                          ASSIGNMENT_MULTIPLIERS.MAX_HAPPINESS,
                          c.happiness + moraleAmount,
                      ),
                  }
                : c,
        ),
    }));

    get().addLog(
        `★ ${crewMember.name}: Поддержка настроения +${moraleAmount}`,
        "info",
    );
    get().gainExp(crewMember, BASE_EXP_REWARDS.MORALE);
};

/**
 * Научные исследования (+100% к науке)
 * Бонус применяется в processResearch() при расчёте скорости исследования
 */
const processResearchAssignment = (
    crewMember: CrewMember,
    currentModule: Module,
    get: () => GameStore,
): void => {
    // Проверяем есть ли лаборатория в модуле
    if (currentModule.type !== "lab") {
        get().addLog(
            `${crewMember.name}: Для исследований нужна лаборатория`,
            "warning",
        );
        return;
    }

    // Начисляем опыт учёному
    get().gainExp(crewMember, BASE_EXP_REWARDS.MORALE);
};

/**
 * Пассивное лечение в медотсеке
 * Медотсек лечит весь экипаж в модуле каждый ход
 * Лечат ТОЛЬКО активные модули (не отключенные вручную или из-за нехватки энергии)
 */
export const processMedicalModule = (
    set: SetState,
    get: () => GameStore,
): void => {
    const crew = get().crew;
    const modules = get().ship.modules;

    // Находим все АКТИВНЫЕ медотсеки (отфильтрованы отключенные)
    const medicalModules = getActiveModules(modules, "medical");

    if (medicalModules.length === 0) return;

    medicalModules.forEach((medicalModule) => {
        // Дополнительная проверка: модуль должен быть активен
        if (!isModuleActive(medicalModule)) return;

        // Находим экипаж в этом медотсеке
        const crewInMedical = crew.filter(
            (c) => c.moduleId === medicalModule.id && c.health > 0,
        );

        if (crewInMedical.length === 0) return;

        // Лечение от модуля
        const healAmount = medicalModule.healing ?? 5;

        crewInMedical.forEach((crewMember) => {
            const maxHealth =
                crewMember.maxHealth || ASSIGNMENT_MULTIPLIERS.MAX_HEALTH;
            if (crewMember.health >= maxHealth) return;

            set((s) => ({
                crew: s.crew.map((c) =>
                    c.id === crewMember.id
                        ? {
                              ...c,
                              health: Math.min(
                                  maxHealth,
                                  c.health + healAmount,
                              ),
                          }
                        : c,
                ),
            }));
        });
    });
};

/**
 * Пассивная регенерация здоровья экипажа
 * Применяется ко всему живому экипажу каждый ход
 * Использует общую функцию calculateHealthRegen
 */
export const processPassiveHealthRegen = (
    set: SetState,
    get: () => GameStore,
): void => {
    const state = get();
    const crew = state.crew.filter((c) => c.health > 0);

    if (crew.length === 0) return;

    crew.forEach((crewMember) => {
        const maxHealth = crewMember.maxHealth;

        // Если здоровье полное, пропускаем
        if (crewMember.health >= maxHealth) return;

        // Используем общую функцию расчёта пассивной регенерации
        const regenAmount = calculateHealthRegen(crewMember);

        // Применяем лечение
        if (regenAmount > 0) {
            set((s) => ({
                crew: s.crew.map((c) =>
                    c.id === crewMember.id
                        ? {
                              ...c,
                              health: Math.min(
                                  maxHealth,
                                  c.health + regenAmount,
                              ),
                          }
                        : c,
                ),
            }));
        }
    });
};
