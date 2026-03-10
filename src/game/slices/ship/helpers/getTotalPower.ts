import {
    calculateArtifactPowerBonus,
    isModuleFunctional,
    isReactorModule,
} from "../utils";
import {
    CREW_ASSIGNMENT_BONUSES,
    CREW_IN_MODULE_BONUSES,
} from "@/game/constants";
import { getMergeEffectsBonus } from "@/game/slices/crew/helpers";
import type { GameState } from "@/game/types/game";

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

    // === Бонус от сращивания ксеноморфов ===
    const mergeBonus = getMergeEffectsBonus(crew, modules);
    if (mergeBonus.powerOutput) {
        power = Math.floor(power * (1 + mergeBonus.powerOutput / 100));
    }

    return power;
}
