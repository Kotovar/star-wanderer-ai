import { store as i18nStore } from "@/lib/useTranslation";
import {
    BASE_EXP_REWARDS,
    ASSIGNMENT_BASES,
    ASSIGNMENT_MULTIPLIERS,
    getTaskBonusMultiplier,
} from "./constants";
import type {
    CrewMember,
    GameStore,
    Module,
    Race,
    SetState,
} from "@/game/types";

/**
 * Рассчитывает бонус от трейтов к заданию
 * @param crewMember - Член экипажа
 * @returns Множитель бонуса (1 если нет бонуса)
 */
/**
 * Обрабатывает боевые назначения экипажа
 * @param crewMember - Член экипажа
 * @param currentModule - Текущий модуль
 * @param crewRace - Раса экипажа
 * @param set - Функция обновления состояния
 * @param get - Функция получения состояния
 */
export const processCombatAssignment = (
    crewMember: CrewMember,
    currentModule: Module | undefined,
    crewRace: Race | undefined,
    set: SetState,
    get: () => GameStore,
): void => {
    if (!currentModule) return;

    const crewInSameModule = get().crew.filter(
        (c) => c.moduleId === crewMember.moduleId && c.id !== crewMember.id,
    );

    switch (crewMember.combatAssignment) {
        case "repair":
            processCombatRepair(crewMember, currentModule, crewRace, set, get);
            break;
        case "heal":
            processCombatHeal(crewMember, crewInSameModule, crewRace, set, get);
            break;
        case "firstaid":
            processCombatFirstAid(crewMember, set, get);
            break;
        case "evasion":
            processCombatEvasion(crewMember, set, get);
            break;
        case "targeting":
            get().addLog( i18nStore.t("game_logs.processCombatAssignments_1", { crewMember_name: crewMember.name }), "combat");
            get().gainExp(crewMember, BASE_EXP_REWARDS.COMBAT_OTHER);
            break;
        case "overclock":
            get().addLog( i18nStore.t("game_logs.processCombatAssignments_2", { crewMember_name: crewMember.name }),
                "combat",
            );
            get().gainExp(crewMember, BASE_EXP_REWARDS.COMBAT_OTHER);
            break;
        case "rapidfire":
            get().addLog( i18nStore.t("game_logs.processCombatAssignments_3", { crewMember_name: crewMember.name }),
                "combat",
            );
            get().gainExp(crewMember, BASE_EXP_REWARDS.COMBAT_OTHER);
            break;
        case "calibration":
            get().addLog( i18nStore.t("game_logs.processCombatAssignments_4", { crewMember_name: crewMember.name }), "combat");
            get().gainExp(crewMember, BASE_EXP_REWARDS.COMBAT_OTHER);
            break;
        case "analysis":
            get().addLog( i18nStore.t("game_logs.processCombatAssignments_5", { crewMember_name: crewMember.name }),
                "combat",
            );
            get().gainExp(crewMember, BASE_EXP_REWARDS.ANALYSIS_SABOTAGE);
            break;
        case "sabotage":
            get().addLog( i18nStore.t("game_logs.processCombatAssignments_6", { crewMember_name: crewMember.name }),
                "combat",
            );
            get().gainExp(crewMember, BASE_EXP_REWARDS.ANALYSIS_SABOTAGE);
            break;
        case "vent_fuel":
            processVentFuel(crewMember, currentModule, set, get);
            break;
    }
};

const processVentFuel = (
    crewMember: CrewMember,
    currentModule: Module,
    set: SetState,
    get: () => GameStore,
): void => {
    const state = get();
    if (currentModule.type !== "fueltank" || state.ship.fuel < 10) return;
    const restored = Math.min(15, state.ship.maxShields - state.ship.shields);
    if (restored <= 0) return;

    set((s) => ({
        ship: {
            ...s.ship,
            fuel: s.ship.fuel - 10,
            shields: s.ship.shields + restored,
        },
    }));
    get().addLog( i18nStore.t("game_logs.processCombatAssignments_7", { crewMember_name: crewMember.name, restored }),
        "combat",
    );
    get().gainExp(crewMember, BASE_EXP_REWARDS.COMBAT_OTHER);
};

/**
 * Экстренный ремонт в бою
 */
const processCombatRepair = (
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
    const repairBonus = (crewRace?.crewBonuses as Record<string, number>)
        .repair;
    if (repairBonus) {
        repairAmount = Math.floor(repairAmount * (1 + repairBonus));
    }

    const maxHealth =
        currentModule.maxHealth || ASSIGNMENT_MULTIPLIERS.MAX_HEALTH;

    if (currentModule.health >= maxHealth) {
        get().addLog( i18nStore.t("game_logs.processCombatAssignments_8", { crewMember_name: crewMember.name, currentModule_name: currentModule.name }),
            "combat",
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
    get().addLog( i18nStore.t("game_logs.processCombatAssignments_9", { crewMember_name: crewMember.name, currentModule_name: currentModule.name, repairAmount }),
        "combat",
    );
    get().gainExp(crewMember, BASE_EXP_REWARDS.COMBAT_REPAIR);
};

/**
 * Лечение в бою
 */
const processCombatHeal = (
    crewMember: CrewMember,
    crewInSameModule: CrewMember[],
    crewRace: Race | undefined,
    set: SetState,
    get: () => GameStore,
): void => {
    if (crewInSameModule.length === 0 && !crewMember.moduleId) return;

    let healAmount: number = Math.floor(
        (ASSIGNMENT_BASES.HEAL_AMOUNT + (crewMember.level ?? 1) - 1) *
            getTaskBonusMultiplier(crewMember),
    );

    // Расовый бонус к лечению
    if (crewRace?.crewBonuses.heal) {
        healAmount = Math.floor(healAmount * (1 + crewRace.crewBonuses.heal));
    }

    const crewNeedingHealing = get().crew.filter(
        (c) =>
            c.moduleId === crewMember.moduleId &&
            c.health < (c.maxHealth || ASSIGNMENT_MULTIPLIERS.MAX_HEALTH),
    );

    if (crewNeedingHealing.length === 0) return;

    set((s) => ({
        crew: s.crew.map((c) =>
            c.moduleId === crewMember.moduleId
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

    get().addLog( i18nStore.t("game_logs.processCombatAssignments_10", { crewMember_name: crewMember.name, healAmount }),
        "combat",
    );
    get().gainExp(crewMember, BASE_EXP_REWARDS.HEAL);
};

/**
 * Первая помощь в бою
 * Уменьшает урон по экипажу в том же модуле
 * @param crewMember - Медик с назначением firstaid
 * @param crewInSameModule - Экипаж в том же модуле
 * @param set - Функция обновления состояния
 * @param get - Функция получения состояния
 */
const processCombatFirstAid = (
    crewMember: CrewMember,
    set: SetState,
    get: () => GameStore,
): void => {
    // Первая помощь работает пассивно - уменьшает урон по экипажу
    // Флаг firstaidActive используется при получении урона
    set((s) => ({
        crew: s.crew.map((c) =>
            c.moduleId === crewMember.moduleId
                ? { ...c, firstaidActive: true }
                : c,
        ),
    }));

    get().addLog( i18nStore.t("game_logs.processCombatAssignments_11", { crewMember_name: crewMember.name }),
        "combat",
    );
};

/**
 * Маневры уклонения в бою
 * Пилот в рубке управления повышает уклонение корабля
 * @param crewMember - Пилот с назначением evasion
 * @param set - Функция обновления состояния
 * @param get - Функция получения состояния
 */
const processCombatEvasion = (
    crewMember: CrewMember,
    _set: SetState,
    get: () => GameStore,
): void => {
    // Evasion bonus is computed dynamically in getTotalEvasion() when
    // combatAssignment === "evasion" — no state mutation needed here.
    get().gainExp(crewMember, BASE_EXP_REWARDS.COMBAT_OTHER);
};
