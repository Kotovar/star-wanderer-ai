import { store as i18nStore } from "@/lib/useTranslation";
import type { CrewTrait, GameStore, SetState } from "@/game/types";
import { CREW_ASSIGNMENT_BONUSES } from "@/game/constants";
import { RACES } from "@/game/constants/races";
import { shiftHappiness } from "@/game/crew";

/** Бонус к настроению от трейта морали */

/** Штраф к настроению при нехватке энергии */
const POWER_SHORTAGE_HAPPINESS_PENALTY = 5;

/** Штраф к настроению при перенаселённости корабля (за каждый ход) */
const OVERCROWDING_HAPPINESS_PENALTY = 5;

/** Урон здоровью синтетиков/нечувствительных рас при перенаселённости (перегрев, помехи) */
const OVERCROWDING_HARDWARE_DAMAGE = 5;

/** Шанс повреждения модуля при нехватке энергии */
const POWER_OVERLOAD_CHANCE = 0.4;

/** Урон модулю от перегрузки */
const POWER_OVERLOAD_DAMAGE = 15;

/** Бонус энергии от назначения экипажа на разгон реактора */
const POWER_ASSIGNMENT_BONUS = CREW_ASSIGNMENT_BONUSES.REACTOR_OVERLOAD;

/**
 * Обрабатывает трейты морали экипажа
 * Члены экипажа с трейтами морали повышают настроение другим в том же модуле
 * @param state - Текущее состояние игры
 * @param set - Функция обновления состояния
 * @param get - Функция получения состояния
 */
export const processMoraleTraits = (
    set: SetState,
    get: () => GameStore,
): void => {
    const crew = get().crew;
    const inCombat = !!get().currentCombat;

    // Боевой дренаж морали от трейтов (напр. "Трус": -10 за ход)
    if (inCombat) {
        crew.forEach((crewMember) => {
            const drain =
                crewMember.traits?.reduce(
                    (sum, t) => sum + (t.effect?.combatMoraleDrain ?? 0),
                    0,
                ) ?? 0;
            if (drain <= 0 || crewMember.happiness <= 0) return;

            set((s) => ({
                crew: s.crew.map((c) =>
                    c.id === crewMember.id ? shiftHappiness(c, -drain) : c,
                ),
            }));
            get().addLog( i18nStore.t("game_logs.processOthers_1", { crewMember_name: crewMember.name, drain }),
                "warning",
            );
        });
    }

    crew.forEach((crewMember) => {
        crewMember.traits?.forEach((trait: CrewTrait) => {
            const moraleBonus = trait.effect.moduleMorale;
            if (!moraleBonus) return;

            // Находим экипаж в том же модуле с пониженным настроением
            const affectedCrew = crew.filter(
                (c) =>
                    c.moduleId === crewMember.moduleId &&
                    c.id !== crewMember.id &&
                    c.happiness < (c.maxHappiness || 100),
            );

            if (affectedCrew.length === 0) return;

            // Повышаем настроение
            set((s) => ({
                crew: s.crew.map((c) =>
                    c.moduleId === crewMember.moduleId && c.id !== crewMember.id
                        ? shiftHappiness(c, moraleBonus)
                        : c,
                ),
            }));

            get().addLog( i18nStore.t("game_logs.processOthers_2", { crewMember_name: crewMember.name, trait_name: trait.name, moraleBonus }),
                "info",
            );
        });
    });
};

/**
 * Штраф к морали при перенаселённости корабля
 * Если экипажа больше, чем модулей, органики теряют мораль
 */
export const processOvercrowding = (
    set: SetState,
    get: () => GameStore,
): void => {
    const crewCount = get().crew.length;
    const crewCapacity = get().getCrewCapacity();

    if (crewCount <= crewCapacity) return;

    const affectedOrganic: string[] = [];
    const affectedSynthetic: string[] = [];

    set((s) => ({
        crew: s.crew.map((c) => {
            const race = RACES[c.race];
            if (race?.hasHappiness === false) {
                // Синтетики и нечувствительные: перегрев/помехи → урон здоровью
                affectedSynthetic.push(c.name);
                return {
                    ...c,
                    health: Math.max(
                        0,
                        c.health - OVERCROWDING_HARDWARE_DAMAGE,
                    ),
                };
            }
            // Органики: штраф морали
            affectedOrganic.push(c.name);
            return {
                ...c,
                happiness: Math.max(
                    0,
                    c.happiness - OVERCROWDING_HAPPINESS_PENALTY,
                ),
            };
        }),
    }));

    if (affectedOrganic.length > 0) {
        get().addLog( i18nStore.t("game_logs.processOthers_3", { crewCount, crewCapacity, OVERCROWDING_HAPPINESS_PENALTY }),
            "warning",
        );
    }
    if (affectedSynthetic.length > 0) {
        get().addLog( i18nStore.t("game_logs.processOthers_4", { OVERCROWDING_HARDWARE_DAMAGE }),
            "warning",
        );
    }
};

/**
 * Обрабатывает несчастный экипаж
 * Члены экипажа с нулевым настроением покидают корабль
 * @param state - Текущее состояние игры
 * @param set - Функция обновления состояния
 * @param get - Функция получения состояния
 */
export const processUnhappyCrew = (
    set: SetState,
    get: () => GameStore,
): void => {
    const unhappyCrew = get().crew.filter(
        (c) => c.happiness === 0 && RACES[c.race]?.hasHappiness !== false,
    );

    unhappyCrew.forEach((crewMember) => {
        get().addLog( i18nStore.t("game_logs.processOthers_5", { crewMember_name: crewMember.name }), "error");
        set((s) => ({
            crew: s.crew.filter((c) => c.id !== crewMember.id),
        }));
    });
};

/**
 * Проверяет критическую нехватку энергии
 * При нехватке энергии:
 * - Весь экипаж теряет настроение
 * - Случайный модуль может получить повреждения от перегрузки
 * @param state - Текущее состояние игры
 * @param set - Функция обновления состояния
 * @param get - Функция получения состояния
 */
export const processPowerCheck = (
    set: SetState,
    get: () => GameStore,
): void => {
    const power = get().getTotalPower();
    const hasReactorOverload = get().crew.some(
        (c) => c.assignment === "reactor_overload",
    );
    const powerBonus = hasReactorOverload ? POWER_ASSIGNMENT_BONUS : 0;
    const consumption = get().getTotalConsumption();
    const available = power + powerBonus - consumption;

    // Энергии достаточно
    if (available >= 0) return;

    get().addLog( i18nStore.t("game_logs.processOthers_6"), "error");

    // Штраф к настроению всего экипажа
    set((s) => ({
        crew: s.crew.map((c) =>
            shiftHappiness(c, -POWER_SHORTAGE_HAPPINESS_PENALTY),
        ),
    }));

    // Шанс повреждения случайного модуля
    if (Math.random() < POWER_OVERLOAD_CHANCE) {
        const modules = get().ship.modules;
        const targetModule =
            modules[Math.floor(Math.random() * modules.length)];

        set((s) => ({
            ship: {
                ...s.ship,
                modules: modules.map((m) =>
                    m.id === targetModule.id
                        ? {
                              ...m,
                              health: Math.max(
                                  0,
                                  m.health - POWER_OVERLOAD_DAMAGE,
                              ),
                          }
                        : m,
                ),
            },
        }));

        get().addLog( i18nStore.t("game_logs.processOthers_7", { targetModule_name: targetModule.name }), "error");
    }
};
