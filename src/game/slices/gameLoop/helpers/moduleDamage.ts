import { DEFAULT_MAX_HEALTH, MIN_CREW_HEALTH } from "@/game/constants";
import { removeDeadCrew } from "./crewUtils";
import type {
    GameState,
    GameStore,
    CrewMember,
    Module,
    SetState,
} from "@/game/types";

// === Constants ===
const CRITICAL_HEALTH_THRESHOLD = 30;
const DAMAGE_IN_CRITICAL_MODULE = 5;
const DAMAGE_IN_BROKEN_MODULE = 20;

/**
 * Вычисляет процент здоровья модуля
 */
const getModuleHealthPercent = (module: Module) =>
    (module.health / (module.maxHealth || DEFAULT_MAX_HEALTH)) * 100;

/**
 * Проверяет, находится ли член экипажа в повреждённом или разрушенном модуле
 */
const isCrewInDamagedModule = (crewMember: CrewMember, state: GameState) => {
    if (crewMember.moduleId === undefined) return false;

    const shipModule = state.ship.modules.find(
        (m) => m.id === crewMember.moduleId,
    );

    if (!shipModule) return false;

    const healthPercent = getModuleHealthPercent(shipModule);
    return healthPercent < CRITICAL_HEALTH_THRESHOLD;
};

/**
 * Вычисляет урон в зависимости от состояния модуля
 * @returns урон для экипажа
 */
const calculateDamage = (healthPercent: number): number => {
    return healthPercent <= 0
        ? DAMAGE_IN_BROKEN_MODULE
        : DAMAGE_IN_CRITICAL_MODULE;
};

/**
 * Применяет урон члену экипажа и логирует событие
 */
const applyDamageToCrewMember = (
    crewMember: CrewMember,
    shipModule: Module,
    damage: number,
    set: SetState,
    get: () => GameStore,
): void => {
    set((s) => ({
        crew: s.crew.map((c) =>
            c.id === crewMember.id
                ? {
                      ...c,
                      health: Math.max(MIN_CREW_HEALTH, c.health - damage),
                  }
                : c,
        ),
    }));

    const healthPercent = getModuleHealthPercent(shipModule);
    const logType = healthPercent <= 0 ? "error" : "warning";
    get().addLog(
        `⚠️ ${crewMember.name} получил -${damage}% урона в ${shipModule.name} (${Math.round(healthPercent)}% ❤️)`,
        logType,
    );
};

/**
 * Проверка повреждений модулей и урон экипажу
 *
 * @param state - Текущее состояние игры
 * @param get - Функция получения состояния
 * @param set - Функция обновления состояния
 */
export const checkModuleDamage = (
    get: () => GameStore,
    set: SetState,
): void => {
    const currentState = get();

    // Находим весь экипаж в повреждённых/разрушенных модулях
    const crewInDamagedModules = currentState.crew.filter((c) =>
        isCrewInDamagedModule(c, currentState),
    );

    if (crewInDamagedModules.length === 0) return;

    // Применяем урон каждому члену экипажа
    crewInDamagedModules.forEach((crewMember) => {
        const shipModule = currentState.ship.modules.find(
            (m) => m.id === crewMember.moduleId,
        );
        if (!shipModule) return;

        const healthPercent = getModuleHealthPercent(shipModule);
        const damage = calculateDamage(healthPercent);

        applyDamageToCrewMember(crewMember, shipModule, damage, set, get);
    });

    removeDeadCrew(set, get);
};
