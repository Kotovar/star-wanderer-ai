import type { GameState, GameStore } from "@/game/types";
import { mineAsteroid } from "./helpers";
import { handleStormEntry } from "./helpers/enterStorm";

// Тип для set с поддержкой immer (позволяет и мутации, и объекты)
type SetState = {
    (
        partial:
            | Partial<GameState>
            | ((state: GameState) => Partial<GameState>),
    ): void;
};

/**
 * Интерфейс LocationsSlice
 */
export interface LocationsSlice {
    mineAsteroid: () => void;
    enterStorm: () => void;
}

/**
 * Создаёт locations слайс для обработки действий в локациях
 */
export const createLocationsSlice = (
    set: SetState,
    get: () => GameStore,
): LocationsSlice => ({
    mineAsteroid: () => {
        mineAsteroid(set, get);
    },
    enterStorm: () => {
        handleStormEntry(set, get);
    },
});
