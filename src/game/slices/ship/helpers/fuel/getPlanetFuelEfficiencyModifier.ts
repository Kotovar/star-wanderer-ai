import type { ActiveEffect } from "@/game/types";

/**
 * Вычисляет суммарный модификатор потребления топлива от активных эффектов
 *
 * @param activeEffects - Массив активных эффектов
 * @returns Модификатор потребления топлива от эффектов (например, 0.9 = -10%)
 */
export const getPlanetFuelEfficiencyModifier = (
    activeEffects: ActiveEffect[],
) => {
    const totalBonus = activeEffects
        .flatMap((effect) => effect.effects)
        .filter(
            (effect) =>
                effect.type === "fuel_efficiency" &&
                typeof effect.value === "number",
        )
        .reduce((sum, effect) => sum + Number(effect.value), 0);

    return Math.min(2, Math.max(0.25, 1 - totalBonus));
};
