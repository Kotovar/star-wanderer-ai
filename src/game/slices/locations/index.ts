import type { GameStore } from "@/game/types";
import { SetState } from "@/game/slices/types";
import { mineAsteroid } from "./helpers";

/**
 * Интерфейс LocationsSlice
 */
export interface LocationsSlice {
    mineAsteroid: () => void;
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
});
