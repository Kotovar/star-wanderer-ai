import { RACES, XENOSYMBIONT_MERGE_EFFECTS } from "@/game/constants";
import { AUGMENTATIONS } from "@/game/constants/augmentations";
import { LAB_MODULE_TYPES } from "@/game/constants/modules";
import {
    getMergeEffectsBonus,
    calculateHealthRegen,
} from "@/game/slices/crew/helpers";
import {
    ASSIGNMENT_BASES,
    ASSIGNMENT_MULTIPLIERS,
    BASE_EXP_REWARDS,
    getTaskBonusMultiplier,
} from "./constants";
import { processCombatAssignment } from "./processCombatAssignments";
import type {
    GameState,
    GameStore,
    CrewMember,
    Module,
    Race,
    SetState,
    LocationType,
} from "@/game/types";
import { isModuleActive } from "@/game/modules/utils";

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

    // Дополнительный шанс сбоя от аугментации overclock_core (+5%)
    if (crewMember.augmentation) {
        const augEffect = AUGMENTATIONS[crewMember.augmentation]?.effect;
        if (augEffect?.aiGlitchChance) {
            glitchChance += augEffect.aiGlitchChance;
        }
    }

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
        case "patrol":
            processPatrolAssignment(crewMember, set, get);
            break;
        // analyzing обрабатывается в handleAnomaly при посещении аномалии
        case "analyzing":
            break;
        case "training":
            processTrainingAssignment(crewMember, currentModule, get);
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
    let repairAmount: number = Math.floor(
        (ASSIGNMENT_BASES.REPAIR_AMOUNT + (crewMember.level ?? 1)) *
            getTaskBonusMultiplier(crewMember),
    );

    // Расовый бонус
    if (crewRace?.crewBonuses.repair) {
        repairAmount = Math.floor(
            repairAmount * (1 + crewRace.crewBonuses.repair),
        );
    }

    // Бонус аугментации nano_hands (+15% ремонт для инженера)
    if (crewMember.augmentation) {
        const augEffect = AUGMENTATIONS[crewMember.augmentation]?.effect;
        if (augEffect?.repairBonus) {
            repairAmount = Math.floor(repairAmount * (1 + augEffect.repairBonus));
        }
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

    // Бонус считается динамически в getTotalPower — здесь только лог и опыт
    const powerBonus = Math.round(
        ASSIGNMENT_BASES.POWER_BONUS * getTaskBonusMultiplier(crewMember),
    );
    get().addLog(
        `⚡ ${crewMember.name}: Разгон реактора +${powerBonus}⚡`,
        "info",
    );
    get().gainExp(crewMember, BASE_EXP_REWARDS.REACTOR_OVERLOAD);
};

/**
 * Назначение на навигацию (-1 к потреблению)
 * Работает только в кабине
 */
const processNavigationAssignment = (
    crewMember: CrewMember,
    currentModule: Module,
    set: SetState,
    get: () => GameStore,
): void => {
    if (currentModule.type !== "cockpit") {
        get().addLog(
            `${crewMember.name}: Навигация возможна только в кабине`,
            "warning",
        );
        return;
    }

    // Бонус считается динамически в getTotalConsumption — здесь только лог
    get().addLog(
        `🧭 ${crewMember.name}: Навигация -${ASSIGNMENT_BASES.NAVIGATION_CONSUMPTION}⚡ потребление`,
        "info",
    );
};

/**
 * Назначение на уклонение
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

    // Бонус считается динамически в getTotalEvasion — здесь только лог и опыт
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
    let healAmount: number = Math.floor(
        (ASSIGNMENT_BASES.HEAL_AMOUNT + (crewMember.level ?? 1) - 1) *
            getTaskBonusMultiplier(crewMember),
    );

    // Расовый бонус к лечению
    if (crewRace?.crewBonuses.heal) {
        healAmount = Math.floor(healAmount * (1 + crewRace.crewBonuses.heal));
    }

    // Бонус аугментации accelerated_regen (+15% лечение для медика)
    if (crewMember.augmentation) {
        const augEffect = AUGMENTATIONS[crewMember.augmentation]?.effect;
        if (augEffect?.healingBonus) {
            healAmount = Math.floor(healAmount * (1 + augEffect.healingBonus));
        }
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
    const moraleAmount: number = Math.floor(
        (ASSIGNMENT_BASES.MORALE_AMOUNT + (crewMember.level ?? 1)) *
            getTaskBonusMultiplier(crewMember),
    );

    const crewToHelp = get().crew.filter(
        (c) =>
            c.moduleId === currentModule.id &&
            c.happiness <
                (c.maxHappiness || ASSIGNMENT_MULTIPLIERS.MAX_HAPPINESS),
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
                          c.maxHappiness ||
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
    // Проверяем есть ли лаборатория в модуле (включая гибридные)
    if (!LAB_MODULE_TYPES.includes(currentModule.type)) {
        get().addLog(
            `${crewMember.name}: Для исследований нужна лаборатория`,
            "warning",
        );
        return;
    }

    // Опыт только если идёт активное исследование
    if (get().research.activeResearch) {
        get().gainExp(crewMember, BASE_EXP_REWARDS.RESEARCH);
    }
};

/**
 * Шанс найти кредиты при патруле зависит от типа локации
 */
const PATROL_LOCATION_CONFIG: Record<
    LocationType | "_default",
    { chance: number; min: number; max: number }
> = {
    asteroid_belt: { chance: 0.25, min: 10, max: 35 },
    planet: { chance: 0.2, min: 5, max: 25 },
    anomaly: { chance: 0.15, min: 10, max: 25 },
    station: { chance: 0.12, min: 10, max: 30 },
    friendly_ship: { chance: 0.1, min: 5, max: 15 },
    enemy: { chance: 0.05, min: 5, max: 10 },
    boss: { chance: 0.05, min: 5, max: 10 },
    storm: { chance: 0.05, min: 5, max: 10 },
    distress_signal: { chance: 0.08, min: 5, max: 15 },
    derelict_ship: { chance: 0.15, min: 10, max: 30 },
    _default: { chance: 0.05, min: 5, max: 10 },
};

/**
 * Патруль разведчика — случайный шанс найти кредиты, зависит от локации
 */
const processPatrolAssignment = (
    crewMember: CrewMember,
    set: SetState,
    get: () => GameStore,
): void => {
    const isTraveling = !!get().traveling;
    const locationType = isTraveling
        ? "_default"
        : (get().currentLocation?.type ?? "_default");
    const config =
        PATROL_LOCATION_CONFIG[locationType] ?? PATROL_LOCATION_CONFIG._default;

    if (Math.random() >= config.chance) {
        return; // Ничего не найдено — без лога, чтобы не спамить
    }

    const credits =
        Math.floor(Math.random() * (config.max - config.min + 1)) + config.min;
    set((s) => ({ credits: s.credits + credits }));
    get().addLog(
        `🔍 ${crewMember.name}: Патруль — найдены ресурсы +${credits}₢`,
        "info",
    );
    get().gainExp(crewMember, BASE_EXP_REWARDS.PATROL);
};

/**
 * Тренировка стрелка — даёт опыт за ход, требует оружейную палубу
 */
const processTrainingAssignment = (
    crewMember: CrewMember,
    currentModule: Module,
    get: () => GameStore,
): void => {
    if (currentModule.type !== "weaponbay") {
        get().addLog(
            `${crewMember.name}: Тренировка возможна только в оружейной палубе`,
            "warning",
        );
        return;
    }
    get().addLog(`🎯 ${crewMember.name}: Тренировка — получен опыт`, "info");
    get().gainExp(crewMember, BASE_EXP_REWARDS.TRAINING);
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

    // Находим все АКТИВНЫЕ медотсеки (включая гибридные модули с лечением)
    const medicalModules = modules.filter(
        (m) => (m.type === "medical" || m.type === "bio_research_lab" || m.type === "habitat_module") && isModuleActive(m),
    );

    if (medicalModules.length === 0) return;

    medicalModules.forEach((medicalModule) => {
        // Дополнительная проверка: модуль должен быть активен
        if (!isModuleActive(medicalModule)) return;

        // Находим экипаж в этом медотсеке
        const crewInMedical = crew.filter(
            (c) => c.moduleId === medicalModule.id && c.health > 0,
        );

        if (crewInMedical.length === 0) return;

        // Лечение от модуля (с бонусом от сращивания ксеноморфа)
        let healAmount = medicalModule.healing ?? 5;
        const hasXenoMerged = crew.some(
            (c) => c.isMerged && c.mergedModuleId === medicalModule.id && c.race === "xenosymbiont",
        );
        if (hasXenoMerged) {
            healAmount = Math.floor(healAmount * 1.25);
        }

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

    const mergeBonus = getMergeEffectsBonus(state.crew, state.ship.modules);
    const crewHealthRegenBonus = mergeBonus.crewHealthRegen ?? 0;

    crew.forEach((crewMember) => {
        const maxHealth = crewMember.maxHealth;

        // Если здоровье полное, пропускаем
        if (crewMember.health >= maxHealth) return;

        // Используем общую функцию расчёта пассивной регенерации
        const regenAmount = calculateHealthRegen(crewMember, get()) + crewHealthRegenBonus;

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
