import type { CrewTrait, GameStore, SetState } from "@/game/types";
import { CREW_ASSIGNMENT_BONUSES } from "@/game/constants";
import { RACES } from "@/game/constants/races";

/** Бонус к настроению от трейта морали */

/** Штраф к настроению при нехватке энергии */
const POWER_SHORTAGE_HAPPINESS_PENALTY = 5;

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
                    c.id === crewMember.id
                        ? { ...c, happiness: Math.max(0, c.happiness - drain) }
                        : c,
                ),
            }));
            get().addLog(
                `😨 ${crewMember.name} (Трус): -${drain} морали`,
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
                        ? {
                              ...c,
                              happiness: Math.min(
                                  c.maxHappiness || 100,
                                  c.happiness + moraleBonus,
                              ),
                          }
                        : c,
                ),
            }));

            get().addLog(
                `★ ${crewMember.name} (${trait.name}): +${moraleBonus} настроения модулю`,
                "info",
            );
        });
    });
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
        get().addLog(`${crewMember.name} покинул корабль!`, "error");
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

    get().addLog("КРИТИЧНО: Недостаток энергии!", "error");

    // Штраф к настроению всего экипажа
    set((s) => ({
        crew: s.crew.map((c) => ({
            ...c,
            happiness: Math.max(
                0,
                c.happiness - POWER_SHORTAGE_HAPPINESS_PENALTY,
            ),
        })),
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

        get().addLog(`"${targetModule.name}" повреждён перегрузкой!`, "error");
    }
};
