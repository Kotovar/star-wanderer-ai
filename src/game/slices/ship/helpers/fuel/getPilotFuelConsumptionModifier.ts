import type { CrewMember } from "@/game/types";

/**
 * Вычисляет модификатор потребления топлива от трейтов пилота
 *
 * @param crew - Массив членов экипажа
 * @returns Модификатор потребления топлива от трейтов пилота
 */
export const getPilotFuelConsumptionModifier = (crew: CrewMember[]) => {
    let modifier = 1;

    const captain = crew.find((c) => c.profession === "pilot");

    captain?.traits.forEach((t) => {
        if (t.effect?.fuelConsumption) {
            modifier *= t.effect.fuelConsumption;
        }
    });

    return modifier;
};
