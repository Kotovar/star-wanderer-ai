import {
    getFuelEfficiency,
    getRaceFuelEfficiencyModifier,
    getPilotFuelConsumptionModifier,
    getPlanetFuelEfficiencyModifier,
} from "@/game/slices/ship";
import { getMergeEffectsBonus } from "@/game/slices/crew/helpers";
import {
    BASE_FUEL_COST_MULTIPLIER,
    DEFAULT_FUEL_COST,
    ARTIFACT_TYPES,
} from "@/game/constants";
import { findActiveArtifact, findArtifactByEffect } from "@/game/artifacts";
import { getActiveModule } from "@/game/modules/utils";
import type { GameState, Sector } from "@/game/types";

/**
 * Множитель расхода топлива без пилота в кабине
 */
const FUEL_PENALTY_NO_PILOT = 1.5;

// ============================================================================
// Вспомогательные функции
// ============================================================================

/**
 * Получает текущий тир с учётом путешествия
 */
const getCurrentTier = (state: GameState) =>
    state.traveling
        ? state.traveling.destination.tier
        : (state.currentSector?.tier ?? 1);

/**
 * Рассчитывает угловое расстояние между секторами (0 to 6)
 */
const calculateAngularDistance = (
    currentSector: Sector | null,
    targetSector: Sector | null,
) => {
    if (!currentSector) return 0;

    const currentAngle = currentSector.mapAngle ?? 0;
    const targetAngle = targetSector?.mapAngle ?? 0;

    // Минимальный угол между двумя точками на круге (0 to π)
    let angleDiff = Math.abs(targetAngle - currentAngle);
    angleDiff = angleDiff % (2 * Math.PI);
    if (angleDiff > Math.PI) {
        angleDiff = 2 * Math.PI - angleDiff;
    }

    // Нормализуем: полный круг = 12 секторов
    return (angleDiff / (2 * Math.PI)) * 12;
};

/**
 * Рассчитывает множитель расстояния
 */
const calculateDistanceMultiplier = (
    tierDistance: number,
    angularDistance: number,
): number => {
    if (tierDistance === 0) {
        // Intra-tier: базовая стоимость 1 + бонус за угловое расстояние
        return (1 + angularDistance * 0.1) * BASE_FUEL_COST_MULTIPLIER;
    }

    // Inter-tier: tierDistance * 1.5 + бонус за угловое расстояние
    return (
        (tierDistance * 1.5 + angularDistance * 0.2) * BASE_FUEL_COST_MULTIPLIER
    );
};

/**
 * Собирает все модификаторы топлива
 */
const collectFuelModifiers = (state: GameState): number => {
    const raceModifier = getRaceFuelEfficiencyModifier(state.crew);
    const pilotModifier = getPilotFuelConsumptionModifier(state.crew);
    const planetModifier = getPlanetFuelEfficiencyModifier(state.activeEffects);

    // Бонус от сращивания ксеноморфов
    const mergeBonus = getMergeEffectsBonus(state.crew, state.ship.modules);
    const mergeFuelModifier = mergeBonus.fuelEfficiency
        ? 1 - mergeBonus.fuelEfficiency / 100
        : 1;

    return raceModifier * pilotModifier * planetModifier * mergeFuelModifier;
};

/**
 * Применяет модификаторы артефактов и штрафы
 */
const applyArtifactModifiers = (
    fuelCost: number,
    hasVoidEngine: boolean,
    hasWarpCoil: boolean,
    pilotInCockpit: boolean,
): { fuelCost: number; travelInstant: boolean } => {
    if (hasVoidEngine) {
        return { fuelCost: 0, travelInstant: false };
    }

    if (hasWarpCoil) {
        return { fuelCost: 0, travelInstant: true };
    }

    if (!pilotInCockpit) {
        return {
            fuelCost: Math.floor(fuelCost * FUEL_PENALTY_NO_PILOT),
            travelInstant: false,
        };
    }

    return { fuelCost, travelInstant: false };
};

// ============================================================================
// Основная функция
// ============================================================================

/**
 * Вычисляет стоимость перелёта в другой сектор с учётом всех модификаторов
 *
 * @param state - Текущее состояние игры
 * @param targetSectorId - Целевой сектор для перелёта
 * @param hasVoidEngine - Есть ли активный void_engine
 * @param hasWarpCoil - Есть ли активный warp_coil
 * @param pilotInCockpit - Находится ли пилот в кабине
 * @returns Объект с итоговой стоимостью топлива и флагом мгновенного перелёта
 */
export const calculateFuelCost = (
    state: GameState,
    targetSectorId: number,
    hasVoidEngine: boolean,
    hasWarpCoil: boolean,
    pilotInCockpit: boolean,
): { fuelCost: number; travelInstant: boolean } => {
    const currentTier = getCurrentTier(state);

    const targetSector = state.galaxy.sectors.find(
        (s) => s.id === targetSectorId,
    );
    if (!targetSector) {
        return { fuelCost: DEFAULT_FUEL_COST, travelInstant: false };
    }

    const tierDistance = Math.abs(targetSector.tier - currentTier);
    const angularDistance = calculateAngularDistance(
        state.currentSector,
        targetSector,
    );

    const distanceMultiplier = calculateDistanceMultiplier(
        tierDistance,
        angularDistance,
    );

    const fuelEfficiency = getFuelEfficiency(state);
    const baseCost = distanceMultiplier * fuelEfficiency;

    const totalModifier = collectFuelModifiers(state);
    let fuelCost = Math.ceil(baseCost * totalModifier);

    if (Number.isNaN(fuelCost)) {
        fuelCost = DEFAULT_FUEL_COST;
    }

    return applyArtifactModifiers(
        fuelCost,
        hasVoidEngine,
        hasWarpCoil,
        pilotInCockpit,
    );
};

/**
 * Рассчитывает стоимость топлива для отображения в UI
 *
 * Автоматически определяет артефакты и состояние пилота
 *
 * @param state - Текущее состояние игры
 * @param targetSectorId - Целевой сектор для перелёта
 * @returns Объект с итоговой стоимостью топлива и флагом мгновенного перелёта
 */
export const calculateFuelCostForUI = (
    state: GameState,
    targetSectorId: number,
): { fuelCost: number; travelInstant: boolean } => {
    // Проверяем артефакты
    const voidEngine = findArtifactByEffect(state, [
        "fuel_free",
        "void_engine",
    ]);
    const warpCoil = findActiveArtifact(
        state.artifacts,
        ARTIFACT_TYPES.WARP_COIL,
    );

    // Проверяем пилота в кабине
    const pilot = state.crew.find((c) => c.profession === "pilot");
    const cockpit = getActiveModule(state.ship.modules, "cockpit");
    const pilotInCockpit = pilot && cockpit && pilot.moduleId === cockpit.id;

    return calculateFuelCost(
        state,
        targetSectorId,
        !!voidEngine,
        !!warpCoil,
        !!pilotInCockpit,
    );
};
