import type { GameStore, SetState } from "@/game/types";
import { removeDeadCrew } from "@/game/slices/gameLoop/helpers/crewUtils";
import { SCIENTIST_BLACK_HOLE_EXP } from "@/game/constants";

// ============================================================================
// Константы
// ============================================================================

/** Базовый урон модулям (минимум) */
const BASE_MODULE_DAMAGE_MIN = 15;

/** Базовый урон модулям (максимум разброса) */
const BASE_MODULE_DAMAGE_RANGE = 20;

/** Базовый урон экипажу (минимум) */
const BASE_CREW_DAMAGE_MIN = 10;

/** Базовый урон экипажу (максимум разброса) */
const BASE_CREW_DAMAGE_RANGE = 15;

/** Снижение урона с учёным */
const SCIENTIST_DAMAGE_REDUCTION = 0.5;

/** Количество модулей для повреждения (минимум) */
const MIN_MODULES_TO_DAMAGE = 1;

/** Количество модулей для повреждения (максимум) */
const MAX_MODULES_TO_DAMAGE = 3;

/** Снижение настроения экипажа */
const HAPPINESS_PENALTY = 15;

// ============================================================================
// Вспомогательные функции
// ============================================================================

/**
 * Рассчитывает урон с учётом множителя
 * @param baseMin - Минимальный базовый урон
 * @param baseRange - Разброс урона
 * @param reduction - Множитель снижения урона
 * @returns Итоговый урон
 */
const calculateDamage = (
    baseMin: number,
    baseRange: number,
    reduction: number,
): number => {
    return Math.floor((baseMin + Math.random() * baseRange) * reduction);
};

// ============================================================================
// Основная функция
// ============================================================================

/**
 * Телепортирует корабль через чёрную дыру в случайный сектор с чёрной дырой
 *
 * Механика:
 * - Требуется сектор с чёрной дырой
 * - Случайная телепортация к другой чёрной дыре
 * - Повреждение модулей и экипажа
 * - Учёный снижает урон на 50% и получает опыт
 * - При гибели всего экипажа - игра заканчивается сразу
 *
 * @param set - Функция обновления состояния
 * @param get - Функция получения состояния
 */
export const travelThroughBlackHole = (
    set: SetState,
    get: () => GameStore,
): void => {
    const state = get();
    const currentSector = state.currentSector;

    // Проверка: в текущем секторе есть чёрная дыра
    if (!currentSector || currentSector.star?.type !== "blackhole") {
        get().addLog("В этом секторе нет чёрной дыры!", "error");
        return;
    }

    // Поиск других чёрных дыр в галактике
    const otherBlackHoles = state.galaxy.sectors.filter(
        (s) => s.star?.type === "blackhole" && s.id !== currentSector.id,
    );

    if (otherBlackHoles.length === 0) {
        get().addLog("Нет другой чёрной дыры для телепортации!", "error");
        return;
    }

    // Случайный выбор цели
    const destination =
        otherBlackHoles[Math.floor(Math.random() * otherBlackHoles.length)];

    // Проверка наличия учёного для снижения урона
    const scientist = state.crew.find((c) => c.profession === "scientist");
    const damageReduction = scientist ? SCIENTIST_DAMAGE_REDUCTION : 1;

    // Расчёт урона
    const baseModuleDamage = calculateDamage(
        BASE_MODULE_DAMAGE_MIN,
        BASE_MODULE_DAMAGE_RANGE,
        damageReduction,
    );
    const baseCrewDamage = calculateDamage(
        BASE_CREW_DAMAGE_MIN,
        BASE_CREW_DAMAGE_RANGE,
        damageReduction,
    );

    // Повреждение случайных модулей
    const damagedModules = state.ship.modules.map((m) => ({ ...m }));
    const numModulesToDamage =
        Math.floor(
            Math.random() * (MAX_MODULES_TO_DAMAGE - MIN_MODULES_TO_DAMAGE + 1),
        ) + MIN_MODULES_TO_DAMAGE;

    for (let i = 0; i < numModulesToDamage; i++) {
        const randomIdx = Math.floor(Math.random() * damagedModules.length);
        damagedModules[randomIdx].health = Math.max(
            1,
            damagedModules[randomIdx].health - baseModuleDamage,
        );
    }

    // Повреждение экипажа и снижение настроения
    const damagedCrew = state.crew.map((c) => ({
        ...c,
        health: Math.max(0, c.health - baseCrewDamage),
        happiness: Math.max(0, c.happiness - HAPPINESS_PENALTY),
    }));

    // Телепортация - применяем повреждения
    set({
        currentSector: destination,
        ship: { ...state.ship, modules: damagedModules },
        crew: damagedCrew,
        gameMode: "sector_map",
    });

    // Логирование
    get().addLog("🕳️ ТЕЛЕПОРТАЦИЯ через чёрную дыру!", "warning");
    get().addLog(`Прибытие в ${destination.name}`, "info");
    get().addLog(
        `Модули повреждены: -${baseModuleDamage}% каждому из ${numModulesToDamage} модулей`,
        "error",
    );
    get().addLog(`Экипаж пострадал: -${baseCrewDamage} здоровья`, "error");

    // Опыт учёному
    if (scientist) {
        get().gainExp(scientist, SCIENTIST_BLACK_HOLE_EXP);
        get().addLog(
            `${scientist.name} изучил чёрную дыру! +${SCIENTIST_BLACK_HOLE_EXP} опыта`,
            "info",
        );
    }

    // Удаление погибшего экипажа
    removeDeadCrew(set, get);

    // Проверка конца игры
    get().checkGameOver();
};
