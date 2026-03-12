import type { GameState, ModuleType } from "../types";
import type { Module } from "@/game/types/modules";

/**
 * Проверяет, активен ли модуль
 * Модуль считается активным, если он не отключён и имеет здоровье > 0
 *
 * @param module - Модуль для проверки
 * @returns true если модуль активен
 */
export const isModuleActive = (module: Module) =>
    !module.disabled && !module.manualDisabled && module.health > 0;

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
 * Находит активный модуль по типу в состоянии игры
 *
 * @param state - Текущее состояние игры
 * @param type - Тип модуля для поиска
 * @returns Активный модуль или undefined
 */
export const getActiveModuleFromState = (state: GameState, type: ModuleType) =>
    getActiveModule(state.ship.modules, type);
