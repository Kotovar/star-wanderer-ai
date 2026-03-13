import type { GameState, GameStore } from "@/game/types";
import { selectSector, selectLocation } from "./helpers";

// Тип для set с поддержкой immer (позволяет и мутации, и объекты)
type SetState = {
    (
        partial:
            | Partial<GameState>
            | ((state: GameState) => Partial<GameState>),
    ): void;
};

/**
 * Интерфейс TravelSlice
 */
export interface TravelSlice {
    selectSector: (sectorId: number) => void;
    selectLocation: (locationIdx: number) => void;
}

/**
 * Создаёт travel слайс
 */
export const createTravelSlice = (
    set: SetState,
    get: () => GameStore,
): TravelSlice => ({
    selectSector: (sectorId) => {
        selectSector(set, get, sectorId);
    },
    selectLocation: (locationIdx) => {
        selectLocation(set, get, locationIdx);
    },
});
