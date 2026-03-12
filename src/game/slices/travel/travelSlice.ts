import type { GameState, GameStore } from "@/game/types";
import { selectSector as selectSectorHelper } from "./helpers";

/**
 * Интерфейс TravelSlice
 */
export interface TravelSlice {
    selectSector: (sectorId: number) => void;
}

/**
 * Создаёт travel слайс
 */
export const createTravelSlice = (
    set: (fn: (state: GameState) => void) => void,
    get: () => GameStore,
): TravelSlice => ({
    selectSector: (sectorId) => {
        selectSectorHelper(set, get, sectorId);
    },
});
