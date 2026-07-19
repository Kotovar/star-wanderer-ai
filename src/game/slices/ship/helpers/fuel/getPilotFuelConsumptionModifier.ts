import type { CrewMember } from "@/game/types";
import { getBestByProfession } from "@/game/crew";

/**
 * Вычисляет модификатор потребления топлива от трейтов пилота
 *
 * @param crew - Массив членов экипажа
 * @returns Модификатор потребления топлива от трейтов пилота
 */
export const getPilotFuelConsumptionModifier = (crew: CrewMember[]) => {
    let modifier = 1;

    // Трейты лучшего пилота: именно он ведёт корабль
    const captain = getBestByProfession(crew, "pilot");

    captain?.traits.forEach((t) => {
        if (t.effect?.fuelConsumption) {
            modifier *= t.effect.fuelConsumption;
        }
    });

    return modifier;
};
