import type { GameState, ModuleType } from "../types";
import type { Module } from "@/game/types/modules";
import { DEFAULT_MAX_HEALTH_MODULE } from "@/game/constants/modules";

/**
 * Проверяет, активен ли модуль
 * Модуль считается активным, если он не отключён и имеет здоровье > 0
 *
 * @param module - Модуль для проверки
 * @returns true если модуль активен
 */
export const isModuleActive = (module: Module) =>
    !module.disabled && !module.manualDisabled && module.health > 0;

/** Процент здоровья, ниже которого модуль начинает наносить урон приписанному экипажу каждый ход. */
const CRITICAL_MODULE_HEALTH_PERCENT = 30;

/**
 * Проверяет, находится ли модуль в критическом состоянии — экипаж, приписанный
 * к такому модулю, получает урон каждый ход (см. checkModuleDamage).
 */
export const isModuleCritical = (module: Module): boolean =>
    (module.health / (module.maxHealth || DEFAULT_MAX_HEALTH_MODULE)) * 100 <
    CRITICAL_MODULE_HEALTH_PERCENT;

/**
 * Находит активный модуль по типу
 *
 * @param modules - Список модулей для поиска
 * @param type - Тип модуля для поиска
 * @returns Активный модуль или undefined
 */
export const getActiveModule = <T extends ModuleType>(
    modules: Module[],
    type: T,
) => modules.find((module) => module.type === type && isModuleActive(module));

/**
 * Фильтрует активные модули указанного типа
 *
 * @param modules - Список модулей для фильтрации
 * @param type - Тип модуля для фильтрации
 * @returns Отфильтрованный список активных модулей
 */
export const getActiveModules = <T extends ModuleType>(
    modules: Module[],
    type: T,
) => modules.filter((m) => m.type === type && isModuleActive(m));

/**
 * Фильтрует модули указанного типа
 *
 * @param state - Текущее состояние игры
 * @param type - Тип модулей для поиска
 * @returns Отфильтрованный список модулей указанного типа
 */
export const getModulesFromState = (state: GameState, type: ModuleType) =>
    state.ship.modules.filter((m) => m.type === type);
