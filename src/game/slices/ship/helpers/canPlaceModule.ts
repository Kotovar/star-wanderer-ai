import type { Module, GameState } from "@/game/types";
import {
    analyzeShipLayout,
    areAllModulesConnected,
    getFirstNewShipLayoutViolation,
    type ShipLayoutViolation,
    type ShipLayoutViolationCode,
} from "@/game/modules";

type ModulePlacement = Pick<
    Module,
    "id" | "type" | "x" | "y" | "width" | "height"
>;
export type PlacementState = {
    ship: Pick<GameState["ship"], "gridSize" | "modules">;
};

export type ModulePlacementFailureCode =
    | "out_of_bounds"
    | "overlap"
    | "disconnected"
    | ShipLayoutViolationCode;

export interface ModulePlacementResult {
    allowed: boolean;
    reason?: ModulePlacementFailureCode;
    violation?: ShipLayoutViolation;
}

/**
 * Проверяет, можно ли разместить модуль на указанных координатах
 *
 * @param module - Модуль для размещения
 * @param x - Координата X
 * @param y - Координата Y
 * @param state - Текущее состояние игры
 * @returns true если размещение возможно
 */
export const getModulePlacementResult = (
    module: ModulePlacement,
    x: number,
    y: number,
    state: PlacementState,
): ModulePlacementResult => {
    // Check grid bounds
    if (
        x < 0 ||
        y < 0 ||
        x + module.width > state.ship.gridSize ||
        y + module.height > state.ship.gridSize
    ) {
        return { allowed: false, reason: "out_of_bounds" };
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
            return { allowed: false, reason: "overlap" };
        }
    }

    const isExistingModule = state.ship.modules.some((m) => m.id === module.id);

    const positionedModule = { ...module, x, y };
    const tempModules = isExistingModule
        ? state.ship.modules.map((m) =>
              m.id === module.id ? positionedModule : m,
          )
        : [...state.ship.modules, positionedModule];

    if (!areAllModulesConnected(tempModules)) {
        return { allowed: false, reason: "disconnected" };
    }

    const current = analyzeShipLayout(
        state.ship.modules,
        state.ship.gridSize,
    );
    const prospective = analyzeShipLayout(tempModules, state.ship.gridSize);
    const violation = getFirstNewShipLayoutViolation(current, prospective);

    return violation
        ? { allowed: false, reason: violation.code, violation }
        : { allowed: true };
};

export const canPlaceModule = (
    module: ModulePlacement,
    x: number,
    y: number,
    state: PlacementState,
): boolean => getModulePlacementResult(module, x, y, state).allowed;
