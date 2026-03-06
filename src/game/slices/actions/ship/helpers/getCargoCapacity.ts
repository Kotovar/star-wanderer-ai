import { MODULES_BY_LEVEL } from "@/game/components/station";
import type { GameState } from "@/game/types/game";
import { getActiveModules } from "@/lib";

const capacityDefault =
    MODULES_BY_LEVEL[1].find((module) => module.moduleType === "cargo")
        ?.capacity ?? 40;

/**
 * Вычисляет общую грузоподъёмность корабля
 * Суммирует capacity всех активных грузовых модулей
 *
 * @param state - Текущее состояние игры
 * @returns Общая грузоподъёмность (по умолчанию 40 на модуль)
 */
export const getCargoCapacity = (state: GameState) => {
    const cargoModules = getActiveModules(state.ship.modules, "cargo");
    return cargoModules.reduce(
        (sum, m) => sum + (m.capacity ?? capacityDefault),
        0,
    );
};
