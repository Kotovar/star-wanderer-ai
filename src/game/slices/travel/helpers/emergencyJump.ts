import { store as i18nStore } from "@/lib/useTranslation";
import { getSectorName } from "@/lib/translationHelpers";
import type { GameStore, SetState } from "@/game/types";
import { calculateFuelCostForUI } from "./calculateFuelCost";
import { applySectorRuleEffect } from "./applySectorRuleEffect";
import { applyPatrolContractCompletions } from "./patrolCompletions";
import { applyNeutronRadiation, handlePatrolContracts } from "./processTravel";

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
        get().addLog( i18nStore.t("game_logs.emergencyJump_1"), "error");
        return;
    }

    const nonBHSectors = state.galaxy.sectors.filter(
        (s) => s.star?.type !== "blackhole" && s.id !== currentSector.id,
    );
    const minFuelNeeded = nonBHSectors.length > 0
        ? Math.min(...nonBHSectors.map((s) => calculateFuelCostForUI(state, s.id).fuelCost))
        : Infinity;

    if (state.ship.fuel >= minFuelNeeded) {
        get().addLog( i18nStore.t("game_logs.emergencyJump_2"), "error");
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
        get().addLog( i18nStore.t("game_logs.emergencyJump_3"), "error");
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
    const patrolContracts = state.activeContracts.filter(
        (contract) =>
            contract.type === "patrol" &&
            contract.isRaceQuest &&
            contract.targetSectors?.includes(destination.id),
    );
    const patrolResult = handlePatrolContracts(
        patrolContracts,
        destination,
        state,
        set,
        get,
    );

    set({
        currentSector: { ...destination, visited: true },
        crewAutomation: {
            ...state.crewAutomation,
            emergencyFuelTarget: null,
        },
        galaxy: {
            ...state.galaxy,
            sectors: state.galaxy.sectors.map((sector) =>
                sector.id === destination.id
                    ? { ...sector, visited: true }
                    : sector,
            ),
        },
        ship: { ...state.ship, modules: damagedModules },
        gameMode: "sector_map",
    });
    if (patrolContracts.length > 0) {
        applyPatrolContractCompletions(patrolResult, set, get);
    }
    applyNeutronRadiation(destination, set, get);
    applySectorRuleEffect(destination, set, get);
    get().syncNavigatorIntel();

    get().addLog( i18nStore.t("game_logs.emergencyJump_4"), "warning");
    get().addLog( i18nStore.t("game_logs.emergencyJump_5", { destination_name: getSectorName(destination.name, i18nStore.t) }), "info");
    get().addLog( i18nStore.t("game_logs.emergencyJump_6", { damage }),
        "error",
    );

    get().updateShipStats();
    if (destination.tier === 4) {
        get().checkVictory();
    }
    get().checkGameOver();
};
