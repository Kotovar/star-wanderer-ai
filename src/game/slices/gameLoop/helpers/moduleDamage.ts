import type { GameState, GameStore, CrewMember, Module } from "@/game/types";

/**
 * Вычисляет процент здоровья модуля
 *
 * @param module - Модуль для проверки
 * @returns Процент здоровья (0-100)
 */
const getModuleHealthPercent = (module: Module) =>
    (module.health / (module.maxHealth || 100)) * 100;

/**
 * Проверяет, находится ли член экипажа в повреждённом модуле
 *
 * @param crewMember - Член экипажа для проверки
 * @param state - Текущее состояние игры
 * @returns true если член экипажа в модуле с здоровьем < 30%
 */
const isCrewInDamagedModule = (crewMember: CrewMember, state: GameState) => {
    if (crewMember.moduleId === undefined) return false;

    const shipModule = state.ship.modules.find(
        (m) => m.id === crewMember.moduleId,
    );

    if (!shipModule) return false;

    const healthPercent = getModuleHealthPercent(shipModule);
    return healthPercent < 30;
};

/**
 * Вычисляет урон для члена экипажа в повреждённом модуле
 *
 * @param healthPercent - Процент здоровья модуля
 * @returns Урон (15 для разрушенного модуля, 5 для повреждённого)
 */
const calculateDamageInModule = (healthPercent: number): number => {
    return healthPercent <= 0 ? 15 : 5;
};

/**
 * Обрабатывает урон члену экипажа в повреждённом модуле
 *
 * @param crewMember - Член экипажа
 * @param shipModule - Модуль, в котором находится член экипажа
 * @param damage - Размер урона
 * @param set - Функция обновления состояния
 * @param get - Функция получения состояния
 */
const applyDamageToCrewMember = (
    crewMember: CrewMember,
    shipModule: Module,
    damage: number,
    set: (fn: (s: GameState) => void) => void,
    get: () => GameStore,
): void => {
    set((s) => ({
        crew: s.crew.map((c) =>
            c.id === crewMember.id
                ? {
                      ...c,
                      health: Math.max(1, c.health - damage),
                  }
                : c,
        ),
    }));

    const healthPercent = getModuleHealthPercent(shipModule);
    get().addLog(
        `⚠️ ${crewMember.name} получил -${damage}% урона в ${shipModule.name} (${Math.round(healthPercent)}% ❤️)`,
        "warning",
    );
};

/**
 * Находит все разрушенные модули, в которых есть экипаж
 *
 * @param state - Текущее состояние игры
 * @returns Список разрушенных модулей с экипажем
 */
const findBrokenModulesWithCrew = (state: GameState): Module[] => {
    return state.ship.modules.filter(
        (m) => m.health <= 0 && state.crew.some((c) => c.moduleId === m.id),
    );
};

/**
 * Применяет урон экипажу в разрушенном модуле
 *
 * @param module - Разрушенный модуль
 * @param set - Функция обновления состояния
 * @param get - Функция получения состояния
 */
const applyDamageInBrokenModule = (
    module: Module,
    set: (fn: (s: GameState) => void) => void,
    get: () => GameStore,
): void => {
    const damage = 10;

    set((s) => ({
        crew: s.crew.map((c) =>
            c.moduleId === module.id
                ? {
                      ...c,
                      health: Math.max(0, c.health - damage),
                  }
                : c,
        ),
    }));

    get().addLog(
        `⚠️ Экипаж в "${module.name}": -${damage} (модуль разрушен)`,
        "error",
    );
};

/**
 * Проверяет и удаляет погибший экипаж
 *
 * @param set - Функция обновления состояния
 * @param get - Функция получения состояния
 */
const removeDeadCrew = (
    set: (fn: (s: GameState) => void) => void,
    get: () => GameStore,
): void => {
    const deadCrew = get().crew.filter((c) => c.health <= 0);

    if (deadCrew.length === 0) return;

    set((s) => ({
        crew: s.crew.filter((c) => c.health > 0),
    }));

    get().addLog(
        `☠️ Погибли: ${deadCrew.map((c) => c.name).join(", ")}`,
        "error",
    );
};

/**
 * Проверка повреждений модулей и урон экипажу
 *
 * Обрабатывает два типа урона экипажу:
 * 1. **Повреждённые модули (< 30% здоровья)**:
 *    - Разрушенный модуль (0% здоровья): 15 урона
 *    - Критически повреждённый (< 30%): 5 урона
 *
 * 2. **Разрушенные модули (0 здоровья)**:
 *    - 10 урона всему экипажу в модуле
 *    - Проверка на гибель экипажа
 *
 * @param state - Текущее состояние игры
 * @param get - Функция получения состояния
 * @param set - Функция обновления состояния
 *
 * @example
 * ```ts
 * // В gameLoopSlice
 * checkModuleDamage(state, get, set);
 * ```
 */
export const checkModuleDamage = (
    state: GameState,
    get: () => GameStore,
    set: (fn: (s: GameState) => void) => void,
): void => {
    const currentState = get();

    // === Этап 1: Урон в повреждённых модулях (< 30% здоровья) ===
    const crewInDamagedModules = currentState.crew.filter((c) =>
        isCrewInDamagedModule(c, currentState),
    );

    if (crewInDamagedModules.length > 0) {
        crewInDamagedModules.forEach((crewMember) => {
            const shipModule = currentState.ship.modules.find(
                (m) => m.id === crewMember.moduleId,
            );
            if (!shipModule) return;

            const healthPercent = getModuleHealthPercent(shipModule);
            const damage = calculateDamageInModule(healthPercent);

            applyDamageToCrewMember(crewMember, shipModule, damage, set, get);
        });
    }

    // === Этап 2: Урон в разрушенных модулях (0 здоровья) ===
    const brokenModulesWithCrew = findBrokenModulesWithCrew(state);

    if (brokenModulesWithCrew.length > 0) {
        brokenModulesWithCrew.forEach((module) => {
            applyDamageInBrokenModule(module, set, get);
        });

        // Проверка на гибель экипажа
        removeDeadCrew(set, get);
    }
};
