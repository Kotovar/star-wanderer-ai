import { store as i18nStore } from "@/lib/useTranslation";
import { getCrewDisplayName } from "@/game/crew/crewNames";
import { getLivingShipCrew, getShipCrew } from "@/game/crew/stationed";
import type { CrewTrait, GameStore, SetState } from "@/game/types";
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
    // Только те, кто на борту и жив: труп не воодушевляет соседей по отсеку,
    // а приписанный к аванпосту находится за несколько секторов отсюда — ни
    // поднимать мораль на корабле, ни терять её в чужом бою он не должен
    const crew = getLivingShipCrew(get().crew);
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
            get().addLog( i18nStore.t("game_logs.processOthers_1", { crewMember_name: getCrewDisplayName(crewMember), drain }),
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
            const affectedIds = new Set(affectedCrew.map((c) => c.id));
            set((s) => ({
                crew: s.crew.map((c) =>
                    affectedIds.has(c.id) ? shiftHappiness(c, moraleBonus) : c,
                ),
            }));

            get().addLog( i18nStore.t("game_logs.processOthers_2", { crewMember_name: getCrewDisplayName(crewMember), trait_name: trait.name, moraleBonus }),
                "info",
            );
        });
    });

    // Мораль в соседних модулях (leader и т.п.) — тот же принцип, что moduleMorale,
    // но зона действия — не сам модуль, а физически смежные с ним
    crew.forEach((crewMember) => {
        crewMember.traits?.forEach((trait: CrewTrait) => {
            const adjacentBonus = trait.effect.adjacentMorale;
            if (!adjacentBonus) return;

            const affectedCrew = crew.filter(
                (c) =>
                    c.id !== crewMember.id &&
                    c.happiness < (c.maxHappiness || 100) &&
                    get().isModuleAdjacent(crewMember.moduleId, c.moduleId),
            );

            if (affectedCrew.length === 0) return;

            const affectedIds = new Set(affectedCrew.map((c) => c.id));
            set((s) => ({
                crew: s.crew.map((c) =>
                    affectedIds.has(c.id)
                        ? shiftHappiness(c, adjacentBonus)
                        : c,
                ),
            }));

            get().addLog( i18nStore.t("game_logs.processOthers_3", { crewMember_name: getCrewDisplayName(crewMember), trait_name: trait.name, adjacentBonus }),
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
    // Приписанные живут на аванпосте — теснота на корабле их не касается
    const crewCount = getShipCrew(get().crew).length;
    const crewCapacity = get().getCrewCapacity();

    if (crewCount <= crewCapacity) return;

    const affectedOrganic: string[] = [];
    const affectedSynthetic: string[] = [];

    set((s) => ({
        crew: s.crew.map((c) => {
            if (c.outpostId) return c;
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
        get().addLog( i18nStore.t("game_logs.processOthers_overcrowding", { crewCount, crewCapacity, OVERCROWDING_HAPPINESS_PENALTY }),
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
    const consumption = get().getTotalConsumption();
    const available = power - consumption;

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
