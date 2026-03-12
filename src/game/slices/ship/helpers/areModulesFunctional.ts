import { getActiveModules } from "@/game/modules/utils";
import type { GameState, ModuleType } from "@/game/types";

/**
 * Проверяет, работает ли хотя бы один модуль указанного типа
 *
 * Модуль считается рабочим, если он активен (не отключён вручную/автоматически и имеет здоровье > 0)
 *
 * @param state - Текущее состояние игры
 * @param moduleType - Тип модуля для проверки
 * @returns true если есть хотя бы один рабочий модуль указанного типа
 */
export const areModulesFunctional = (
    state: GameState,
    moduleType: ModuleType,
) => {
    const modules = getActiveModules(state.ship.modules, moduleType);
    return modules.length > 0;
};
