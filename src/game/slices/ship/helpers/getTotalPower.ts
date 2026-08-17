import {
    calculateArtifactPowerBonus,
    isModuleFunctional,
} from "../utils";
import { getTechBonusSum } from "@/game/research";
import { getMergeEffectsBonus } from "@/game/slices/crew/helpers";
import { getReactorOverloadPower } from "@/game/slices/gameLoop/processors/crewAssignments/constants";
import { getStrongestTechPerkValue } from "@/game/constants/techTree";
import { getStarTypeEffect } from "@/game/constants/starEffects";
import { getLivingShipCrew } from "@/game/crew/stationed";
import { REACTOR_MODULE_TYPES } from "@/game/constants/modules";
import type { GameState } from "@/game/types/game";

/**
 * Вычисляет общую мощность энергии корабля
 *
 * Учитывает:
 * - Базовую энергию от реакторов и других модулей
 * - Бонус от назначения экипажа на энергию (+5, затем +1 за уровень)
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

    // === Бонус ветки "Реакторный инженер" (лучший инженер экипажа, не суммируется) ===
    const bestEngineerPowerBonus = getStrongestTechPerkValue(
        crew,
        "engineer",
        "B",
    );
    if (bestEngineerPowerBonus > 0) {
        const reactorCount = modules.filter(
            (m) => REACTOR_MODULE_TYPES.includes(m.type) && isModuleFunctional(m),
        ).length;
        power += bestEngineerPowerBonus * reactorCount;
    }

    // === Бонус от назначения "разгон реактора" (reactor_overload) ===
    // Считается динамически (не накапливается в state)
    const reactorIds = new Set(
        modules
            .filter((m) => REACTOR_MODULE_TYPES.includes(m.type) && isModuleFunctional(m))
            .map((m) => m.id),
    );
    // Живой: смерть не снимает назначение, и труп продолжал разгонять реактор
    getLivingShipCrew(crew).filter(
        (c) =>
            c.profession === "engineer" &&
            c.assignment === "reactor_overload" &&
            reactorIds.has(c.moduleId),
    ).forEach((c) => {
        power += getReactorOverloadPower(c);
    });

    // === Бонус от типа звезды текущего сектора (двойная система) ===
    if (state.currentSector) {
        power += getStarTypeEffect(state.currentSector.star.type).powerBonus ?? 0;
    }

    // === Бонус от исследований (module_power) — runtime ===
    const techPowerBonus = getTechBonusSum(state.research, "module_power");
    if (techPowerBonus > 0) {
        power = Math.floor(power * (1 + techPowerBonus));
    }

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
