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
            get().addLog(`${crewMember.name}: Прицельный огонь`, "combat");
            get().gainExp(crewMember, BASE_EXP_REWARDS.COMBAT_OTHER);
            break;
        case "overclock":
            get().addLog(
                `${crewMember.name}: Перегрузка оружия (+15% урон, броня модуля = 0)`,
                "combat",
            );
            get().gainExp(crewMember, BASE_EXP_REWARDS.COMBAT_OTHER);
            break;
        case "rapidfire":
            get().addLog(
                `${crewMember.name}: Учащённая стрельба (+25% урон, -10% точность)`,
                "combat",
            );
            get().gainExp(crewMember, BASE_EXP_REWARDS.COMBAT_OTHER);
            break;
        case "calibration":
            get().addLog(`${crewMember.name}: Калибровка оружия (+10% точность)`, "combat");
            get().gainExp(crewMember, BASE_EXP_REWARDS.COMBAT_OTHER);
            break;
        case "analysis":
            get().addLog(
                `${crewMember.name}: Анализ уязвимостей врага`,
                "combat",
            );
            get().gainExp(crewMember, BASE_EXP_REWARDS.ANALYSIS_SABOTAGE);
            break;
        case "sabotage":
            get().addLog(
                `${crewMember.name}: Диверсии (-5% точность врага)`,
                "combat",
            );
            get().gainExp(crewMember, BASE_EXP_REWARDS.ANALYSIS_SABOTAGE);
            break;
    }
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
        get().addLog(
            `${crewMember.name}: Модуль "${currentModule.name}" полностью цел`,
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
    get().addLog(
        `${crewMember.name}: Экстренный ремонт "${currentModule.name}" +${repairAmount}%`,
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
        (ASSIGNMENT_BASES.HEAL_AMOUNT + (crewMember.level ?? 1)) *
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

    get().addLog(
        `${crewMember.name}: Экстренная помощь +${healAmount}❤️`,
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

    get().addLog(
        `${crewMember.name}: Медпаки готовы (защита экипажа)`,
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
