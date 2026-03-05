import type { GameState } from "@/game/types/game";
import {
    calculateArtifactPowerBonus,
    isModuleFunctional,
    isReactorModule,
} from "./utils";
import {
    CREW_ASSIGNMENT_BONUSES,
    CREW_IN_MODULE_BONUSES,
    RACES,
} from "@/game/constants";

/**
 * Вычисляет общую мощность энергии корабля
 *
 * Учитывает:
 * - Базовую энергию от реакторов и других модулей
 * - Бонус от назначения экипажа на энергию (+5)
 * - Бонусы от артефактов (Реактор Бездны, Вечное ядро)
 * - Бонус от эффектов планет (временные эффекты от специализации)
 * - Бонус от инженеров в реакторах (+3 к энергии за каждого)
 *
 * @param state - Текущее состояние игры
 * @returns Общая мощность энергии
 */
export function getTotalPower(state: GameState): number {
    const { crew, artifacts, ship } = state;
    const { modules } = ship;

    // === Базовая энергия от модулей ===
    let power = modules
        .filter(isModuleFunctional)
        .reduce((sum, m) => sum + (m.power ?? 0), 0);

    // === Бонус от назначения экипажа "разгон реактора" ===
    // Инженер с назначением "reactor_overload" в реакторе даёт +5 к энергии
    const hasReactorOverload = crew.some(
        (c) => c.assignment === "reactor_overload",
    );
    if (hasReactorOverload) {
        power += CREW_ASSIGNMENT_BONUSES.REACTOR_OVERLOAD;
    }

    // === Бонус от инженеров в реакторах ===
    const engineersInReactors = crew.filter(
        (c) =>
            c.profession === "engineer" &&
            c.moduleId !== undefined &&
            isReactorModule(modules, c.moduleId),
    ).length;

    if (engineersInReactors > 0) {
        // +3 к энергии за каждого инженера в реакторе
        power +=
            engineersInReactors * CREW_IN_MODULE_BONUSES.ENGINEER_IN_REACTOR;
    }

    // === Бонусы от артефактов ===
    const artifactBonus = calculateArtifactPowerBonus(artifacts, state);
    power += artifactBonus;

    return power;
}

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
