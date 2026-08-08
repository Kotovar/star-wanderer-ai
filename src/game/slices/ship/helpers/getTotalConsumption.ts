import { getRaceCrewBonus } from "@/game/races";
import { CREW_ASSIGNMENT_BONUSES } from "@/game/constants";
import { getStrongestRaceTechPerkValue } from "@/game/constants/techTree";
import { getRunModifierValue } from "@/game/constants/launchModifiers";
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
    const syntheticBonus = getStrongestRaceTechPerkValue(crew, "synthetic");

    // === Бонус от назначения "навигация" ===
    // Считается динамически (не накапливается в state), учитывает трейты
    // Навигация работает в кабине (cockpit)
    const cockpitIds = new Set(
        modules
            .filter((m) => m.type === "cockpit" && isModuleFunctional(m))
            .map((m) => m.id),
    );
    const navPilotsInCockpit = crew.filter(
        (c) =>
            c.profession === "pilot" &&
            c.assignment === "navigation" &&
            cockpitIds.has(c.moduleId),
    );
    const pilotRed = navPilotsInCockpit.length > 0
        ? navPilotsInCockpit.reduce(
              (sum, c) =>
                  sum +
                  Math.round(
                      Math.abs(CREW_ASSIGNMENT_BONUSES.NAVIGATION_REDUCED_CONSUMPTION) *
                          getTaskBonusMultiplier(c),
                  ),
              0,
          )
        : 0;

    // === Снижение потребления от модификатора запуска ===
    // «Ослабленный реактор»: низковольтная переделка — каждый модуль дешевле,
    // но сам реактор слабее. Выгодно только на широком корабле.
    const consumptionReduction = getRunModifierValue(
        state.startModifierIds,
        "moduleConsumptionReduction",
    );

    // === Базовое потребление модулей ===
    let baseConsumption = 0;

    for (const shipModule of modules) {
        if (!isModuleFunctional(shipModule)) {
            continue;
        }

        let moduleConsumption = shipModule.consumption ?? 0;

        // Потребляющие модули не могут стать бесплатными
        if (consumptionReduction > 0 && moduleConsumption > 0) {
            moduleConsumption = Math.max(
                1,
                moduleConsumption - consumptionReduction,
            );
        }

        // === Применяем расовые бонусы экипажа ===
        // Некоторые расы имеют бонус к энергии (отрицательное значение = снижение потребления)
        const crewInModule = crew.filter((c) => c.moduleId === shipModule.id);

        for (const crewMember of crewInModule) {
            const energyBonus = getRaceCrewBonus(crewMember.race, "energy");

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
    return Math.max(0, baseConsumption * (1 - syntheticBonus) - pilotRed);
}
