import { CREW_ASSIGNMENT_BONUSES, RACES } from "@/game/constants";
import { isModuleFunctional } from "../utils";
import type { GameState } from "@/game/types";

/**
 * Вычисляет общее потребление энергии кораблём
 *
 * Учитывает:
 * - Базовое потребление модулей
 * - Расовые бонусы экипажа к энергии (например, ксеносимбионт: -25% потребления)
 * - Бонус от назначения пилота "навигация" (-1 к потреблению)
 *
 * @param state - Текущее состояние игры
 * @returns Общее потребление энергии
 */
export function getTotalConsumption(state: GameState): number {
    const { ship, crew } = state;
    const { modules } = ship;

    // === Бонус от назначения пилота "навигация" ===
    // Пилот с назначением "navigation" снижает общее потребление на 1
    const hasNavigation = crew.some((c) => c.assignment === "navigation");
    const pilotRed = hasNavigation
        ? CREW_ASSIGNMENT_BONUSES.NAVIGATION_REDUCED_CONSUMPTION
        : 0;

    // === Базовое потребление модулей ===
    let baseConsumption = 0;

    for (const shipModule of modules) {
        if (!isModuleFunctional(shipModule)) {
            continue;
        }

        let moduleConsumption = shipModule.consumption ?? 0;

        // === Применяем расовые бонусы экипажа ===
        // Некоторые расы имеют бонус к энергии (отрицательное значение = снижение потребления)
        const crewInModule = crew.filter((c) => c.moduleId === shipModule.id);

        for (const crewMember of crewInModule) {
            const race = RACES[crewMember.race];
            const energyBonus = race?.crewBonuses.energy;

            // Отрицательный бонус к энергии означает снижение потребления
            // Например, ксеносимбионт: -25% потребления
            if (energyBonus && energyBonus < 0) {
                moduleConsumption = Math.floor(
                    moduleConsumption * (1 + energyBonus),
                );
            }
        }

        baseConsumption += moduleConsumption;
    }

    // Итоговое потребление не может быть отрицательным
    return Math.max(0, baseConsumption - pilotRed);
}
