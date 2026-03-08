import type { ActiveEffect } from "@/game/types";

/**
 * Вычисляет модификатор потребления топлива от активных эффектов планеты
 *
 * @param activeEffects - Массив активных эффектов
 * @returns Модификатор потребления топлива от эффектов (например, 0.9 = -10%)
 */
export const getPlanetFuelEfficiencyModifier = (
    activeEffects: ActiveEffect[],
) => {
    for (const effect of activeEffects) {
        const fuelEfficiency = effect.effects.find(
            (ef) => ef.type === "fuel_efficiency",
        );

        if (fuelEfficiency && typeof fuelEfficiency.value === "number") {
            return 1 - fuelEfficiency.value;
        }
    }

    return 1;
};
