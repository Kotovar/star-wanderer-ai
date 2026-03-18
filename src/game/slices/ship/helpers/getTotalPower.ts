import {
    calculateArtifactPowerBonus,
    isModuleFunctional,
} from "../utils";
import { CREW_ASSIGNMENT_BONUSES } from "@/game/constants";
import { getMergeEffectsBonus } from "@/game/slices/crew/helpers";
import { getTaskBonusMultiplier } from "@/game/slices/gameLoop/processors/crewAssignments/constants";
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

    // === Бонус от назначения "разгон реактора" (reactor_overload) ===
    // Считается динамически (не накапливается в state)
    const reactorIds = new Set(
        modules
            .filter((m) => m.type === "reactor" && isModuleFunctional(m))
            .map((m) => m.id),
    );
    crew.filter(
        (c) => c.assignment === "reactor_overload" && reactorIds.has(c.moduleId),
    ).forEach((c) => {
        power += Math.round(
            CREW_ASSIGNMENT_BONUSES.REACTOR_OVERLOAD *
                getTaskBonusMultiplier(c),
        );
    });

// === Бонусы от артефактов ===
    const artifactBonus = calculateArtifactPowerBonus(artifacts, state);
    power += artifactBonus;

    // === Бонус от сращивания ксеноморфов ===
    const mergeBonus = getMergeEffectsBonus(crew, modules);
    if (mergeBonus.powerOutput) {
        power = Math.floor(power * (1 + mergeBonus.powerOutput / 100));
    }

    // === Временные бонусы от эффектов планет (Crystalline и др.) ===
    if (ship.bonusPower) {
        power += ship.bonusPower;
    }

    return power;
}
