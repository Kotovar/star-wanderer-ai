import { CREW_ASSIGNMENT_BONUSES, RACES } from "@/game/constants";
import { getTaskBonusMultiplier } from "@/game/slices/gameLoop/processors/crewAssignments/constants";
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

    // === Бонус от назначения "навигация" ===
    // Считается динамически (не накапливается в state), учитывает трейты
    // Навигация работает в кабине (cockpit)
    const cockpitIds = new Set(
        modules
            .filter((m) => m.type === "cockpit" && isModuleFunctional(m))
            .map((m) => m.id),
    );
    const navCrewInEngine = crew.filter(
        (c) => c.assignment === "navigation" && cockpitIds.has(c.moduleId),
    );
    const pilotRed = navCrewInEngine.length > 0
        ? navCrewInEngine.reduce(
              (sum, c) =>
                  sum +
                  Math.round(
                      Math.abs(CREW_ASSIGNMENT_BONUSES.NAVIGATION_REDUCED_CONSUMPTION) *
                          getTaskBonusMultiplier(c),
                  ),
              0,
          )
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
