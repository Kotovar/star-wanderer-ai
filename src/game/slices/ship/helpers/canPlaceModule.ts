import type { Module, GameState } from "@/game/types";
import { areAllModulesConnected } from "@/game/modules";

/**
 * Проверяет, можно ли разместить модуль на указанных координатах
 *
 * @param module - Модуль для размещения
 * @param x - Координата X
 * @param y - Координата Y
 * @param state - Текущее состояние игры
 * @returns true если размещение возможно
 */
export const canPlaceModule = (
    module: Module,
    x: number,
    y: number,
    state: GameState,
): boolean => {
    // Check grid bounds
    if (
        x < 0 ||
        y < 0 ||
        x + module.width > state.ship.gridSize ||
        y + module.height > state.ship.gridSize
    ) {
        return false;
    }

    // Check collision with other modules
    for (const other of state.ship.modules) {
        if (other.id === module.id) continue;
        if (
            !(
                x + module.width <= other.x ||
                x >= other.x + other.width ||
                y + module.height <= other.y ||
                y >= other.y + other.height
            )
        ) {
            return false;
        }
    }

    // If only one module, no need to check connectivity
    if (state.ship.modules.length === 1) return true;

    // Check connectivity with temporary module position
    const tempModules = state.ship.modules.map((m) =>
        m.id === module.id ? { ...m, x, y } : m,
    );

    return areAllModulesConnected(tempModules);
};
