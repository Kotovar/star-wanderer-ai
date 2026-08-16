import { store as i18nStore } from "@/lib/useTranslation";
import type {
    GameStore,
    SetState,
    RaceId,
    ActiveEffect,
    Artifact,
} from "@/game/types";
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
/**
 * Можно ли усилить артефакт ритуалом.
 *
 * Единая проверка для отметки `boosted` и для самого эффекта усиления: раньше
 * условие было только в `boostArtifact`, а `createVoidbornBoostEffect` вешал
 * эффект без спроса. Выключенный артефакт при этом получал реальный буст, но
 * игрок видел ошибку и не видел значка «усилен».
 */
export const isBoostableArtifact = (
    artifact: Artifact | undefined,
): artifact is Artifact =>
    !!artifact && !!artifact.effect.active && artifact.canBoost !== false;

export const boostArtifact = (
    artifactId: string,
    state: GameStore,
    set: SetState,
    get: () => GameStore,
): void => {
    const artifact = state.artifacts.find((a) => a.id === artifactId);

    if (!isBoostableArtifact(artifact)) {
        get().addLog( i18nStore.t("game_logs.boostArtifact_1"), "error");
        return;
    }

    // Помечаем артефакт как усиленный (фактический бонус применяется через activeEffect)
    set((s) => ({
        artifacts: s.artifacts.map((a) =>
            a.id === artifactId ? { ...a, boosted: true } : a,
        ),
    }));

    get().addLog( i18nStore.t("game_logs.boostArtifact_2", { artifact_name: artifact.name }), "info");
    playSound("world_artifact");
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

    // Если выбран артефакт и его вообще можно усилить — добавляем эффект.
    // Проверка та же, что в boostArtifact: иначе эффект и отметка расходятся.
    const effects: ActiveEffect[] = [fuelEffect];
    if (
        artifactId &&
        isBoostableArtifact(get().artifacts.find((a) => a.id === artifactId))
    ) {
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
