import type { GameStore, Artifact, SetState } from "@/game/types";
import {
    researchArtifact as researchArtifactFn,
    toggleArtifact as toggleArtifactFn,
    tryFindArtifact as tryFindArtifactFn,
    boostArtifact as boostArtifactFn,
} from "./helpers";

/**
 * Интерфейс ArtifactsSlice
 * Содержит методы для управления артефактами
 */
export interface ArtifactsSlice {
    /**
     * Исследует артефакт и активирует его эффект
     * @param artifactId - ID артефакта для исследования
     */
    researchArtifact: (artifactId: string) => void;

    /**
     * Активирует или деактивирует артефакт
     * @param artifactId - ID артефакта для переключения
     */
    toggleArtifact: (artifactId: string) => void;

    /**
     * Пытается найти артефакт (шанс зависит от тира сектора и бонусов)
     * @returns Найденный артефакт или null
     */
    tryFindArtifact: () => Artifact | null;

    /**
     * Помечает артефакт для усиления ритуалом Voidborn
     * @param artifactId - ID артефакта для усиления
     */
    boostArtifact: (artifactId: string) => void;
}

/**
 * Создаёт слайс для обработки артефактов
 *
 * @param set - Функция обновления состояния
 * @param get - Функция получения состояния
 * @returns Методы для управления артефактами
 */
export const createArtifactsSlice = (
    set: SetState,
    get: () => GameStore,
): ArtifactsSlice => ({
    researchArtifact: (artifactId) => {
        const state = get();
        researchArtifactFn(artifactId, state, set, get);
    },

    toggleArtifact: (artifactId) => {
        const state = get();
        toggleArtifactFn(artifactId, state, set, get);
    },

    tryFindArtifact: () => {
        const state = get();
        return tryFindArtifactFn(state, set, get);
    },

    boostArtifact: (artifactId) => {
        const state = get();
        boostArtifactFn(artifactId, state, set, get);
    },
});
