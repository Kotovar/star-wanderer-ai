import type { GameStore, SetState } from "@/game/types";
import { calculateFuelCostForUI } from "./calculateFuelCost";

// ============================================================================
// Константы
// ============================================================================

/** Минимальный урон модулям при аварийном прыжке (%) */
const EMERGENCY_MODULE_DAMAGE_MIN = 25;

/** Разброс урона модулям при аварийном прыжке (%) */
const EMERGENCY_MODULE_DAMAGE_RANGE = 15;

// ============================================================================
// Основная функция
// ============================================================================

/**
 * Аварийный прыжок из сектора с чёрной дырой при нулевом топливе.
 *
 * Механика:
 * - Доступен только в секторе с ЧД при fuel === 0
 * - Прыгает в ближайший сектор без ЧД
 * - Наносит урон всем модулям (25–40% каждому)
 * - Топливо не расходуется (его нет)
 *
 * @param set - Функция обновления состояния
 * @param get - Функция получения состояния
 */
export const emergencyJump = (set: SetState, get: () => GameStore): void => {
    const state = get();
    const currentSector = state.currentSector;

    if (!currentSector || currentSector.star?.type !== "blackhole") {
        get().addLog("Аварийный прыжок доступен только в секторе с чёрной дырой!", "error");
        return;
    }

    const nonBHSectors = state.galaxy.sectors.filter(
        (s) => s.star?.type !== "blackhole" && s.id !== currentSector.id,
    );
    const minFuelNeeded = nonBHSectors.length > 0
        ? Math.min(...nonBHSectors.map((s) => calculateFuelCostForUI(state, s.id).fuelCost))
        : Infinity;

    if (state.ship.fuel >= minFuelNeeded) {
        get().addLog("Топлива достаточно для обычного прыжка!", "error");
        return;
    }

    // Найти ближайший сектор без ЧД по координатам карты
    const toXY = (angle: number, radius: number) => ({
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
    });

    const curPos = toXY(currentSector.mapAngle ?? 0, currentSector.mapRadius ?? 0);

    const normalSectors = state.galaxy.sectors.filter(
        (s) => s.star?.type !== "blackhole" && s.id !== currentSector.id,
    );

    if (normalSectors.length === 0) {
        get().addLog("Нет доступных секторов для аварийного прыжка!", "error");
        return;
    }

    const destination = normalSectors.reduce((nearest, sector) => {
        const pos = toXY(sector.mapAngle ?? 0, sector.mapRadius ?? 0);
        const dx = pos.x - curPos.x;
        const dy = pos.y - curPos.y;
        const dist = dx * dx + dy * dy;

        const nearestPos = toXY(nearest.mapAngle ?? 0, nearest.mapRadius ?? 0);
        const ndx = nearestPos.x - curPos.x;
        const ndy = nearestPos.y - curPos.y;
        const nearestDist = ndx * ndx + ndy * ndy;

        return dist < nearestDist ? sector : nearest;
    });

    // Урон всем модулям
    const damage =
        EMERGENCY_MODULE_DAMAGE_MIN +
        Math.floor(Math.random() * EMERGENCY_MODULE_DAMAGE_RANGE);

    const damagedModules = state.ship.modules.map((m) => ({
        ...m,
        health: Math.max(1, m.health - damage),
    }));

    set({
        currentSector: destination,
        ship: { ...state.ship, modules: damagedModules },
        gameMode: "sector_map",
    });

    get().addLog("⚡ АВАРИЙНЫЙ ПРЫЖОК активирован!", "warning");
    get().addLog(`Прибытие в ${destination.name}`, "info");
    get().addLog(
        `Перегрузка систем: все модули повреждены на -${damage}%`,
        "error",
    );

    get().updateShipStats();
    get().checkGameOver();
};
