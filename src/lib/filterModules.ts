import type { Module, ModuleType } from "@/game/types/modules";

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
