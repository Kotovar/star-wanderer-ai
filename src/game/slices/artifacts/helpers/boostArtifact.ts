import type { GameStore, SetState, RaceId, ActiveEffect } from "@/game/types";
import { playSound } from "@/sounds";
import {
    ARTIFACT_BOOST_BONUS,
    VOIDBORN_FUEL_EFFICIENCY_BONUS,
} from "../constants";

/**
 * Помечает артефакт для усиления ритуалом Voidborn
 *
 * @param artifactId - ID артефакта для усиления
 * @param state - Текущее состояние игры
 * @param set - Функция обновления состояния
 * @param get - Функция получения состояния
 * @returns void
 */
export const boostArtifact = (
    artifactId: string,
    state: GameStore,
    set: SetState,
    get: () => GameStore,
): void => {
    const artifact = state.artifacts.find((a) => a.id === artifactId);

    if (!artifact || !artifact.effect.active) {
        get().addLog("Выберите активный артефакт!", "error");
        return;
    }

    // Помечаем артефакт как усиленный (фактический бонус применяется через activeEffect)
    set((s) => ({
        artifacts: s.artifacts.map((a) =>
            a.id === artifactId ? { ...a, boosted: true } : a,
        ),
    }));

    get().addLog(`🔮 ${artifact.name} готов к усилению!`, "info");
    playSound("success");
};

/**
 * Создаёт эффект усиления артефакта для ритуала Voidborn
 *
 * @param artifactId - ID усиливаемого артефакта
 * @param raceId - ID расы (voidborn)
 * @param spec - Спецификация способности планеты
 * @param set - Функция обновления состояния
 * @param get - Функция получения состояния
 */
export const createVoidbornBoostEffect = (
    artifactId: string | undefined,
    raceId: RaceId,
    spec: {
        name: string;
        description: string;
        duration: number;
    },
    set: SetState,
    get: () => GameStore,
): void => {
    // Создаём эффект для топлива (всегда)
    const fuelEffect: ActiveEffect = {
        id: `effect-${raceId}-fuel-${Date.now()}`,
        name: spec.name,
        description: `${spec.description} (топливо)`,
        raceId,
        turnsRemaining: spec.duration,
        effects: [
            {
                type: "fuel_efficiency",
                value: VOIDBORN_FUEL_EFFICIENCY_BONUS,
            },
        ],
    };

    // Если выбран артефакт, добавляем эффект усиления
    const effects: ActiveEffect[] = [fuelEffect];
    if (artifactId) {
        effects.push({
            id: `effect-${raceId}-boost-${Date.now()}`,
            name: spec.name,
            description: `${spec.description} (артефакт)`,
            raceId,
            turnsRemaining: spec.duration,
            effects: [{ type: "artifact_boost", value: ARTIFACT_BOOST_BONUS }],
            targetArtifactId: artifactId,
        });
    }

    set((s) => ({
        activeEffects: [...s.activeEffects, ...effects],
    }));

    get().updateShipStats();
};
