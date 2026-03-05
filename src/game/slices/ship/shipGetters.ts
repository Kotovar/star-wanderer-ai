import type { GameState } from "@/game/types/game";
import { getArtifactEffectValue } from "@/game/artifacts";
import { findActiveArtifact, isModuleFunctional } from "./utils";
import type { ArtifactType } from "@/game/types";

/**
 * Типы артефактов, влияющие на энергию корабля
 */
const POWER_ARTIFACT_TYPES: Record<string, ArtifactType> = {
    ABYSS_POWER: "abyss_power",
    FREE_POWER: "free_power",
};

/**
 * Вычисляет общую мощность энергии корабля
 * Учитывает модули, назначения экипажа, артефакты и эффекты планет
 * @param state - Текущее состояние игры
 * @returns Общая мощность энергии
 */
export function getTotalPower(state: GameState): number {
    const { modules } = state.ship;

    // Базовая энергия от модулей
    let power = modules
        .filter(isModuleFunctional)
        .reduce((sum, m) => sum + (m.power ?? 0), 0);

    // Бонус от назначения экипажа "энергия" (+5)
    const powerBoost = state.crew.some((c) => c.assignment === "power") ? 5 : 0;
    power += powerBoost;

    // Артефакт "Реактор Бездны" (+25)
    const abyssReactor = findActiveArtifact(
        state.artifacts,
        POWER_ARTIFACT_TYPES.ABYSS_POWER,
    );
    if (abyssReactor) {
        power += getArtifactEffectValue(abyssReactor, state);
    }

    // Артефакт "Вечное ядро" (+10)
    const eternalReactor = findActiveArtifact(
        state.artifacts,
        POWER_ARTIFACT_TYPES.FREE_POWER,
    );
    if (eternalReactor) {
        power += getArtifactEffectValue(eternalReactor, state);
    }

    // Бонус от эффектов планет
    const bonusPower = state.ship.bonusPower ?? 0;
    power += bonusPower;

    return power;
}
