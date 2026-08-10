import type { CrewMember } from "@/game/types";

/**
 * Вычисляет модификатор потребления топлива от трейтов пилота
 *
 * @param crew - Массив членов экипажа
 * @returns Модификатор потребления топлива от трейтов пилота
 */
export const getPilotFuelConsumptionModifier = (crew: CrewMember[]) => {
    let modifier = 1;

    // Трейты лучшего пилота: именно он ведёт корабль
    const captain = crew
        .filter((crewMember) => crewMember.profession === "pilot")
        .sort((a, b) => (b.level ?? 1) - (a.level ?? 1))[0];

    captain?.traits.forEach((t) => {
        if (t.effect?.fuelConsumption) {
            modifier *= t.effect.fuelConsumption;
        }
    });

    return modifier;
};
