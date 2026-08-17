import type { Module, GameState } from "@/game/types";
import { areAllModulesConnected } from "@/game/modules";

type ModulePlacement = Pick<Module, "id" | "x" | "y" | "width" | "height">;
type PlacementState = {
    ship: Pick<GameState["ship"], "gridSize" | "modules">;
};

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
    module: ModulePlacement,
    x: number,
    y: number,
    state: PlacementState,
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

    const isExistingModule = state.ship.modules.some((m) => m.id === module.id);

    // Moving the only module cannot disconnect the ship.
    if (isExistingModule && state.ship.modules.length === 1) return true;

    const positionedModule = { ...module, x, y };
    const tempModules = isExistingModule
        ? state.ship.modules.map((m) =>
              m.id === module.id ? positionedModule : m,
          )
        : [...state.ship.modules, positionedModule];

    return areAllModulesConnected(tempModules);
};
